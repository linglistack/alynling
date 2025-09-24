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


market_selection_ui <- function(id) {
  ns <- NS(id)
  tagList(
    h4("Step 2: Market selection parameters"),
    numericInput(ns("cpic"), "CPIC", 1, min = 0),
    textInput(
      ns("treatment_periods"),
      "Treatment periods (comma-separated)",
      ""
    ),
    textInput(ns("include_markets"), "Include markets (comma-separated)", ""),
    textInput(ns("exclude_markets"), "Exclude markets (comma-separated)", ""),
    textInput(ns("X2"), "Other vars (comma-separated)", ""),
    numericInput(ns("size_of_effect"), "Size of effect", 0.3),
    selectInput(
      ns("direction_of_effect"),
      "Direction of effect",
      c("pos", "neg", "both")
    ),
    numericInput(ns("alpha"), "Alpha", 0.05),
    textInput(ns("N"), "N (comma-separated)", 3),
    textInput(ns("holdout"), "Holdout (comma-separated)", ""),
    numericInput(ns("budget"), "Budget", NA),
    checkboxInput(ns("fixed_effects"), "Fixed effects", TRUE),
    checkboxInput(ns("Correlations"), "Correlations", TRUE),
    actionButton(ns("market_select"), "Select Market"),
    hr(),
    h3("top choices"),
    tableOutput(ns("rankings"))
  )
}

market_selection_server <- function(id, api_url, dataset_id) {
  moduleServer(id, function(input, output, session) {

    # return value: will hold obj_ID once available
    obj_ID_reactive <- reactiveVal(NULL)

    parse_csv <- function(x) {
      if (is.null(x) || x == "") {
        return(c())
      }
      unlist(strsplit(x, ",\\s*"))
    }

    observeEvent(input$market_select, {
      req(dataset_id())

      res <- POST(
        url = paste0(api_url, "/api/market-selection"),
        body = list(
          data_ID = dataset_id(),
          cpic = input$cpic,
          treatment_periods = as.integer(parse_csv(input$treatment_periods)),
          include_markets = parse_csv(input$include_markets),
          exclude_markets = parse_csv(input$exclude_markets),
          X = parse_csv(input$X2),
          size_of_effect = input$size_of_effect,
          direction_of_effect = input$direction_of_effect,
          alpha = input$alpha,
          N = as.integer(parse_csv(input$N)),
          holdout = as.numeric(parse_csv(input$holdout)),
          budget = if (is.na(input$budget)) NULL else input$budget,
          fixed_effects = input$fixed_effects,
          Correlations = input$Correlations
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(
          paste("Market selection failed:", status_code(res)),
          type = "error"
        )
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)

      # store obj_ID for later use
      obj_ID_reactive(result$obj_ID)

      # render top choices as table
      output$rankings <- renderTable({
        as.data.frame(result$top_choices)
      })
    })

    # return obj_ID so the caller can chain off it
    return(obj_ID_reactive)
  })
}


power_analysis_ui <- function(id) {
  ns <- NS(id)
  tagList(
    numericInput(ns("location_ID"), "Location ID", value = 1, min = 1),
    actionButton(ns("run_power"), "Run Power Analysis"),
    hr(),
    plotOutput(ns("lifted_plot")),
    plotOutput(ns("power_plot"))
  )
}

power_analysis_server <- function(id, api_url, obj_ID) {
  moduleServer(id, function(input, output, session) {

    observeEvent(input$run_power, {
      req(obj_ID())

      res <- POST(
        url = paste0(api_url, "/api/power-analysis"),
        body = list(
          obj_ID = obj_ID(),
          location_ID = as.integer(input$location_ID)
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(paste("Power analysis failed:", status_code(res)), type = "error")
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)


      lifted_data  <- as.data.frame(result$lifted_data)
      lifted_power <- as.data.frame(result$lifted_power)

      # Treatment Effect Over Time
      output$lifted_plot <- renderPlot({
        ggplot(lifted_data, aes(x = Time)) +
          geom_line(aes(y = t_obs, colour = "Treatment")) +
          geom_line(aes(y = c_obs, colour = "Control")) +
          geom_ribbon(
            aes(ymin = c_obs_lower_bound, ymax = c_obs_upper_bound),
            alpha = 0.2, fill = "blue"
          ) +
          labs(title = "Treatment Effect Over Time", y = "Observed Value") +
          theme_minimal()
      })

      # Power Curve
      output$power_plot <- renderPlot({
        ggplot(lifted_power, aes(x = EffectSize, y = power)) +
          geom_line(colour = "darkred") +
          labs(title = "Power Curve: Effect Size vs. Statistical Power",
               x = "Effect Size", y = "Power") +
          theme_minimal()
      })
    })
  })
}



ui <- fluidPage(
  sidebarLayout(
    sidebarPanel(
      upload_ui("uploader"),
      market_selection_ui("selector"),
      power_analysis_ui("power")
    ),
    mainPanel(
      plotOutput("selector-rankings") # adjust as needed
    )
  )
)

server <- function(input, output, session) {
  dataset_id <- upload_server("uploader", api_url)
  obj_ID     <- market_selection_server("selector", api_url, dataset_id)
  power_analysis_server("power", api_url, obj_ID)
}


api_url <- "http://localhost:8000"
shinyApp(ui, server)
