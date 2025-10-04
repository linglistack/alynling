library(shiny)
library(httr)
library(jsonlite)
library(ggplot2)
library(dplyr)

upload_ui <- function(id) {
  ns <- NS(id)
  tagList(
    h4("Step 1: Upload & preprocess data"),
    fileInput(ns("file"), "Upload CSV File", accept = ".csv"),
    textInput(ns("location_col"), "Location column", "location"),
    textInput(ns("time_col"), "Time column", "date"),
    textInput(ns("outcome_col"), "Outcome column", "Y"),
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
    ns <- session$ns
    rv <- reactiveValues(dataset_id = NULL, data_preview = NULL)

    # Step 1: user uploads CSV → autodetect
    observeEvent(input$file, {
      req(input$file)

      csv_data <- readChar(
        input$file$datapath,
        file.info(input$file$datapath)$size
      )

      res <- POST(
        url = paste0(api_url, "/api/upload_autodetect"),
        body = list(csv_data = csv_data),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification("Autodetect failed", type = "error")
        return()
      }

      result <- content(res, as = "parsed", type = "application/json")$output_obj

      # Save data_ID for next step
      rv$dataset_id <- result$data_ID

      safe_first <- function(x, default) {
        if (is.null(x) || length(x) == 0) {
          default
        } else {
          x[[1]]
        }
      }

      # Auto-fill text boxes with first suggestion if available
      updateTextInput(
        session,
        "time_col",
        value = safe_first(result$suggestions$time, "date")
      )
      updateTextInput(
        session,
        "location_col",
        value = safe_first(result$suggestions$location, "location")
      )
      updateTextInput(
        session,
        "outcome_col",
        value = safe_first(result$suggestions$outcome, "Y")
      )

      showNotification("Autodetect complete. Please review column names.")
    })

    # Step 2: user hits submit → finalize upload
    observeEvent(input$submit, {
      req(rv$dataset_id)

      res <- POST(
        url = paste0(api_url, "/api/upload"),
        body = list(
          data_ID = rv$dataset_id,
          location_col = input$location_col,
          time_col = input$time_col,
          outcome_col = input$outcome_col,
          format = input$format,
          X = unlist(strsplit(input$X, ",\\s*"))
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification("Upload failed", type = "error")
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)$output_obj

      # Save preview
      if (!is.null(result$data)) {
        rv$data_preview <- as.data.frame(result$data)
      }

      showNotification(paste("Upload successful. Dataset ID:", rv$dataset_id))
    })

    # Preview
    output$data_preview <- renderTable(head(rv$data_preview))

    return(reactive(rv$dataset_id))
  })
}

geolift_ui <- function(id) {
  ns <- NS(id)
  tagList(
    textInput(ns("locations"), "Locations (comma-separated)", value = "chicago, cincinnati; honolulu, indianapolis"),
    numericInput(ns("treatment_start_time"), "Treatment Start Time", value = 91),
    numericInput(ns("treatment_end_time"), "Treatment End Time", value = 105),
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
    single_cell_indicator_reactive <- reactiveVal(NULL)

    parse_locations <- function(txt) {
      cells <- strsplit(txt, ";\\s*")[[1]]
      out <- setNames(vector("list", length(cells)), paste0("cell_", seq_along(cells)))
      for (i in seq_along(cells)) {
        out[[i]] <- as.list(strsplit(cells[i], ",\\s*")[[1]])
      }
      out
    }

    observeEvent(input$run_geolift, {
      req(dataset_id())

      res <- POST(
        url = paste0(api_url, "/api/geolift"),
        body = list(
          data_ID = dataset_id(),
          locations = parse_locations(input$locations),
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

      result <- content(res, as = "parsed", simplifyVector = TRUE)$output_obj

      # Save obj_ID for downstream modules
      obj_ID_reactive(result$obj_ID)
      single_cell_indicator_reactive(result$single_cell)

      # Display summary as a table
      output$summary <- renderTable({
        as.data.frame(result$summary)
      }, rownames = TRUE)
    })

    return(list(obj_ID = obj_ID_reactive, single_cell = single_cell_indicator_reactive))
  })
}

geolift_result_ui <- function(id) {
  ns <- NS(id)
  tagList(
    actionButton(ns("fetch_results"), "Fetch GeoLift Results"),
    hr(),
    h4("Lift Data"),
    tableOutput(ns("lift_table")),
    h4("ATT Data"),
    tableOutput(ns("att_table"))
  )
}


geolift_result_server <- function(id, api_url, obj_ID, single_cell) {
  moduleServer(id, function(input, output, session) {

    rv <- reactiveValues(lift = NULL, att = NULL)

    observeEvent(input$fetch_results, {

      req(!is.null(obj_ID()))
      req(!is.null(single_cell()))
      res <- POST(
        url = paste0(api_url, "/api/geolift_result"),
        body = list(
          obj_ID = obj_ID(),
          single_cell = single_cell()
        ),
        encode = "json"
      )

      success = content(res, as = "parsed", simplifyVector = TRUE)$success
      if(!success) {
        showNotification("something crashed silently")
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)$output_obj

      if (!is.null(result$lift_data)) {
        rv$lift <- as.data.frame(result$lift_data) %>% na.omit() %>% head()
      }
      if (!is.null(result$att_data)) {
        rv$att <- as.data.frame(result$att_data) %>% na.omit() %>% head()
      }

      showNotification("GeoLift results fetched successfully")
    })

    output$lift_table <- renderTable({
      req(rv$lift)
      rv$lift
    })

    output$att_table <- renderTable({
      req(rv$att)
      rv$att
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

  GL_res <- geolift_server("geolift", api_url, dataset_id)

  GL_obj_ID <- GL_res$obj_ID
  GL_single_cell <- GL_res$single_cell

  geolift_result_server("results", api_url, GL_obj_ID, GL_single_cell)
}



api_url <- "http://localhost:8000"
shinyApp(ui, server)
