# app.R
library(shiny)
library(httr)
library(jsonlite)
library(ggplot2)

upload_ui <- function(id) {
  ns <- NS(id)
  tagList(
    h4("Step 1: Upload & preprocess data"),
    fileInput(ns("file"), "Upload CSV File", accept = ".csv"),
    textInput(ns("location_col"), "Location column", "city"),
    textInput(ns("time_col"), "Time column", "date"),
    textInput(ns("outcome_col"), "Outcome column", "app_per_pop"),
    textInput(ns("format"), "Date format", "yyyy-mm-dd"),
    textInput(ns("X"), "Other vars (comma-separated)", ""),
    actionButton(ns("submit"), "Submit to API"),
    hr(),
    h4("Preview of uploaded data"),
    tableOutput(ns("data_preview"))
  )
}

upload_server <- function(id, api_url) {
  moduleServer(id, function(input, output, session) {
    rv <- reactiveValues(dataset_id = NULL, data_preview = NULL)

    observeEvent(input$submit, {
      req(input$file)
      csv_data <- readChar(
        input$file$datapath,
        file.info(input$file$datapath)$size
      )

      res <- POST(
        url = paste0(api_url, "/api/data/upload"),
        body = list(
          csv_data = csv_data,
          location_col = input$location_col,
          time_col = input$time_col,
          outcome_col = input$outcome_col,
          format = input$format,
          X = unlist(strsplit(input$X, ",\\s*"))
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(
          paste("Upload failed:", status_code(res)),
          type = "error"
        )
        return()
      }

      result <- content(res, as = "parsed", type = "application/json")

      rv$dataset_id <- result$data_ID %||% result$dataset_id

      # Try to coerce data into data.frame
      if (!is.null(result$data)) {
        rv$data_preview <- as.data.frame(result$data)
      }

      showNotification(paste("Upload successful. Dataset ID:", rv$dataset_id))
    })

    # render preview table
    output$data_preview <- renderTable({
      rv$data_preview
    })

    # return just the dataset_id for chaining
    return(reactive(rv$dataset_id))
  })
}

geolift_ui <- function(id) {
  ns <- NS(id)
  tagList(
    textInput(ns("locations"), "Locations (comma-separated)", value = "Vermont, Alabama"),
    numericInput(ns("treatment_start_time"), "Treatment Start Time", value = 62),
    numericInput(ns("treatment_end_time"), "Treatment End Time", value = 71),
    numericInput(ns("alpha"), "Alpha", value = 0.05, min = 0, max = 1, step = 0.01),
    selectInput(ns("stat_test"), "Statistical Test",
                choices = c("pos", "neg", "both"), selected = "pos"),
    actionButton(ns("run_geolift"), "Run GeoLift"),
    hr(),
    h4("GeoLift Summary"),
    tableOutput(ns("summary"))
  )
}

geolift_server <- function(id, api_url, dataset_id) {
  moduleServer(id, function(input, output, session) {

    obj_ID_reactive <- reactiveVal(NULL)

    parse_csv <- function(x) {
      if (is.null(x) || x == "") {
        return(NULL)
      }
      unlist(strsplit(x, ",\\s*"))
    }

    observeEvent(input$run_geolift, {
      req(dataset_id())

      res <- POST(
        url = paste0(api_url, "/api/geolift"),
        body = list(
          data_ID = dataset_id(),
          locations = parse_csv(input$locations),
          treatment_start_time = input$treatment_start_time,
          treatment_end_time   = input$treatment_end_time,
          alpha = input$alpha,
          stat_test = input$stat_test
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(
          paste("GeoLift test failed:", status_code(res)),
          type = "error"
        )
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)

      # Save obj_ID for downstream modules
      obj_ID_reactive(result$obj_ID)

      # Display summary as a table
      output$summary <- renderTable({
        as.data.frame(result$summary)
      }, rownames = TRUE)
    })

    return(obj_ID_reactive)
  })
}

geolift_result_ui <- function(id) {
  ns <- NS(id)
  tagList(
    actionButton(ns("fetch_results"), "Fetch GeoLift Results"),
    hr(),
    plotOutput(ns("lift_plot")),
    plotOutput(ns("att_plot"))
  )
}

geolift_result_server <- function(id, api_url, obj_ID) {
  moduleServer(id, function(input, output, session) {

    observeEvent(input$fetch_results, {
      req(obj_ID())

      res <- POST(
        url = paste0(api_url, "/api/geolift_result"),
        body = list(obj_ID = obj_ID()),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(
          paste("Fetching results failed:", status_code(res)),
          type = "error"
        )
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)

      lift_data <- as.data.frame(result$lift_data)
      att_data  <- as.data.frame(result$att_data)

      # Treatment Effect Over Time
      output$lift_plot <- renderPlot({
        ggplot(lift_data, aes(x = Time)) +
          geom_line(aes(y = t_obs, colour = "Treatment")) +
          geom_line(aes(y = c_obs, colour = "Control")) +
          geom_ribbon(
            aes(ymin = c_obs_lower_bound, ymax = c_obs_upper_bound),
            alpha = 0.2, fill = "blue"
          ) +
          labs(title = "Treatment Effect Over Time", y = "Observed Value") +
          theme_minimal()
      })

      # ATE Over Time
      output$att_plot <- renderPlot({
        ggplot(att_data, aes(x = Time)) +
          geom_line(aes(y = Estimate), colour = "darkred") +
          geom_ribbon(
            aes(ymin = lower_bound, ymax = upper_bound),
            alpha = 0.2, fill = "red"
          ) +
          labs(title = "Average Treatment Effect (ATE) Over Time",
               y = "ATE Estimate") +
          theme_minimal()
      })
    })
  })
}





ui <- fluidPage(
  sidebarLayout(
    sidebarPanel(
      upload_ui("uploader"),
      geolift_ui("geolift"),
      geolift_result_ui("results")
    ),
    mainPanel()
  )
)

server <- function(input, output, session) {
  dataset_id <- upload_server("uploader", api_url)
  geolift_obj_ID <- geolift_server("geolift", api_url, dataset_id)
  geolift_result_server("results", api_url, geolift_obj_ID)
}



api_url <- "http://localhost:8000"
shinyApp(ui, server)
