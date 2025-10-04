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


market_selection_ui <- function(id) {
  ns <- NS(id)
  tags$head(
    tags$style(HTML(
      "
    .highlight-input input {
      border: 2px solid red;
      background-color: #fff8f8;
    }
  "
    ))
  )

  tagList(
    h4("Step 2: Market selection parameters"),
    numericInput(ns("number_of_cells"), "Number of Cells: BASIC", 1, min = 1),
    textInput(
      ns("treatment_periods"),
      "Treatment periods (comma-separated): BASIC",
      ""
    ),
    numericInput(ns("cpic"), "CPIC: BASIC", 1, min = 0),
    textInput(
      ns("include_markets"),
      "Include Markets (comma-separated): BASIC",
      ""
    ),
    textInput(
      ns("exclude_markets"),
      "Exclude Markets (comma-separated): BASIC",
      ""
    ),
    checkboxInput(ns("quick_result"), "Quick Result: BASIC", value = FALSE),
    textInput(ns("X2"), "Other Vars (comma-separated): ADV", ""),
    numericInput(ns("size_of_effect"), "Max Size of Effect: ADV", 0.3),
    selectInput(
      ns("direction_of_effect"),
      "Direction of Effect: ADV",
      c("pos", "neg", "both")
    ),
    numericInput(ns("alpha"), "Alpha: ADV", 0.05),
    textInput(ns("N"), "N (comma-separated): ADV", 3),
    numericInput(ns("min_holdout"), "Mininum Holdout: ADV", 0),
    numericInput(ns("max_holdout"), "Maxinum Holdout: ADV", 1),
    numericInput(ns("budget"), "Strict Budget Limit: ADV", NA),
    checkboxInput(ns("fixed_effects"), "Fixed Effects: ADV", TRUE),
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
    single_cell_reactive <- reactiveVal(NULL)

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
          number_of_cells = input$number_of_cells,
          treatment_periods = as.integer(parse_csv(input$treatment_periods)),
          include_markets = parse_csv(input$include_markets),
          exclude_markets = parse_csv(input$exclude_markets),
          X = parse_csv(input$X2),
          size_of_effect = input$size_of_effect,
          direction_of_effect = input$direction_of_effect,
          alpha = input$alpha,
          N = as.integer(parse_csv(input$N)),
          min_holdout = as.numeric(input$min_holdout),
          max_holdout = as.numeric(input$max_holdout),
          budget = if (is.na(input$budget)) NULL else input$budget,
          quick_result = input$quick_result,
          fixed_effects = input$fixed_effects
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

      result <- content(res, as = "parsed", simplifyVector = TRUE)$output_obj

      # store obj_ID for later use
      obj_ID_reactive(result$obj_ID)
      single_cell_reactive(result$single_cell)

      # render top choices as table
      output$rankings <- renderTable({
        as.data.frame(result$top_choices) %>% head(5)
      })
    })

    # return obj_ID so the caller can chain off it
    return(list(obj_ID = obj_ID_reactive, single_cell = single_cell_reactive))
  })
}


power_analysis_ui <- function(id) {
  ns <- NS(id)
  tagList(
    textInput(ns("location_ID"), "Location IDs (comma-separated)", value = "1"),
    actionButton(ns("run_power"), "Run Power Analysis"),
    hr(),
    h4("Lifted Data (top 10 rows)"),
    tableOutput(ns("lifted_table")),
    h4("Power Data (top 10 rows)"),
    tableOutput(ns("power_table"))
  )
}

power_analysis_server <- function(id, api_url, obj_ID, single_cell) {
  moduleServer(id, function(input, output, session) {
    observeEvent(input$run_power, {
      req(obj_ID())

      loc_ids <- strsplit(input$location_ID, ",\\s*")[[1]]
      res <- POST(
        url = paste0(api_url, "/api/power-analysis"),
        body = list(
          obj_ID = obj_ID(),
          single_cell = single_cell(),
          location_ID = as.integer(loc_ids[loc_ids != ""])
        ),
        encode = "json"
      )

      if (http_error(res)) {
        showNotification(
          paste("Power analysis failed:", status_code(res)),
          type = "error"
        )
        return()
      }

      result <- content(res, as = "parsed", simplifyVector = TRUE)$output_obj

      lifted_data <- as.data.frame(result$lifted_data)

      lifted_power <- as.data.frame(result$lifted_power)

      output$lifted_table <- renderTable({
        head(lifted_data %>% na.omit(), 5)
      })

      output$power_table <- renderTable({
        head(lifted_power, 5)
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
  ms_res <- market_selection_server("selector", api_url, dataset_id)
  obj_ID <- ms_res$obj_ID
  single_cell <- ms_res$single_cell
  power_analysis_server("power", api_url, obj_ID, single_cell)
}


api_url <- "http://localhost:8000"
shinyApp(ui, server)
