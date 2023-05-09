convertTestFile <- function() {
  inFile <- choose.files(filters=Filters[c("input")])
  if( !endsWith(inFile,".input") ) {
    stop("Input file must be of the format '*.txt.input'")
  }
  outFile <- substring(inFile,0,nchar(inFile) - nchar(".input"))
  
  data <- paste(readLines(inFile),collapse="\n")
  codeIn <- stringr::str_extract_all(data,"#[^#]*")[[1]]
  parseOut <- sapply(codeIn,analyzeCode)
  tests <- paste(codeIn,"\n==>\n\n",parseOut,"\n\n",sep="")
  writeLines(tests,outFile)
}

analyzeCode <- function(codeText) {
  exprs <- rlang::parse_exprs(codeText)
  exprParseStrings <- sapply(exprs,processExpr)
  sprintf("Script(%s)",paste(exprParseStrings,collapse=","))
}

processExpr <- function(astEntry) {
  astList = as.list(astEntry)
  
  if(rlang::is_syntactic_literal(astEntry)) {
    getLiteralType(astList)
  }
  else if(rlang::is_symbol(astEntry)) {
    #getSymbol(astList)
    "Identifier"
  }
  else if(rlang::is_call(astEntry)) {
    getCallText(astList)
  }
  else if(rlang::is_pairlist(astEntry)) {
    stop("pairlist!")
  }
  else {
    stop("unkown!")
  }
}

getLiteralType <- function(astList) {
  type <- class(astList[[1]])
  switch(type,
         numeric="Numeric",
         character="Character",
         boolean="Boolean",
         logical="Logical",
         complex="Complex",
         type)
}

getSymbol <- function(astList) {
  as.character(astList[[1]])
}

getCallText <- function(astList) {
  if(rlang::is_symbol(astList[[1]])) {
    ## we are calling a function named by this symbo
    callSymbol <- as.character(astList[[1]])
    outputFunction <- getCallOutputFunction(callSymbol)
  }
  else {
    ##we are calling a function we get from evaluating another function
    callSymbol = NULL
    outputFunction = NULL
  }
  
  if(!is.null(outputFunction)) {
    argStringVector <- sapply(tail(astList,-1),processExpr)
    outputFunction(callSymbol,argStringVector)
  }
  else if(identical(callSymbol,"function")) {
    getFunctionDef(astList)
  }
  else {
    getStdCall(astList)
  }
}

##===============================
## Convert the output to match our javscript test format
##===============================

getCallOutputFunction <- function(callSymbol) {
  switch(callSymbol,
         `+` = getUnaryBinary,
         `-` = getUnaryBinary,
         `!` = getUnaryBinary,
         `::` = getBinary,
         `:` = getBinary,
         `*` = getBinary,
         `/` = getBinary,
         `^` = getBinary,
         `<` = getBinary,
         `>` = getBinary,
         `<=` = getBinary,
         `>=` = getBinary,
         `==` = getBinary,
         `!=` = getBinary,
         `&` = getBinary,
         `&&` = getBinary,
         `|` = getBinary,
         `||` = getBinary,
         `<-` = getBinary,
         `<<-` = getBinary,
         `$` = getSubset,
         `[` = getSubset,
         `[[` = getSubset,
         `@` =  getSubset,
         `::`= getMember,
         `:::`= getMember,
         `~` = getFormula,
         `if` = getIf,
         `repeat` = getRepeat,
         `while` = getWhile,
         `for` = getFor,
         `{` = getBlock,
         `(` = getParen,
         NULL
  )
}

getUnaryBinary <- function(callSymbol,argStrings) {
  parseType <- if(length(argStrings) == 1) "UnaryExpression" else "BinaryExpression"
  getOperator(parseType,callSymbol,argStrings)
} 

getBinary <- function(callSymbol,argStrings) getOperator("BinaryExpression",callSymbol,argStrings)
getSubset <- function(callSymbol,argStrings) getOperator("Subset",callSymbol,argStrings)
getMember <- function(callSymbol,argStrings) getOperator("Member",callSymbol,argStrings)
getFormula <- function(callSymbol,argStrings) getOperator("Formula",callSymbol,argStrings)
getInfix <- function(callSymbol,argStrings) getOperator("INfix",callSymbol,argStrings)

getIf <- function(callSymbol,argStrings) {
  if(length(argStrings) > 2) {
    sprintf('IfExpr("if",%s,%s,"else",%s)',argStrings[1],argStrings[2],argStrings[3])
  }
  else {
    sprintf('IfExpr("if",%s,%s)',argStrings[1],argStrings[2])
  }
  
}
getRepeat <- function() ""
getWhile <- function() ""
getFor <- function() ""
getBlock <- function() ""
getParen <- function() ""


getOperator <- function(parseType,callSymbol,argStrings) {
  if(length(argStrings) == 1) {
    ##unary operator
    sprintf('%s(%s,"%s")',parseType,callSymbol,argStrings[1])
  }
  else  {
    ##binary operator
    sprintf('%s(%s,"%s",%s)',parseType,argStrings[1],callSymbol,argStrings[2])
  }
}

getStdCall <- function(astList) {
  ##either we have an identifier (passed) or we must get the expression string for the call
  callExprString <- if(rlang::is_symbol(astList[[1]])) "Identifier" else processExpr(astList[[1]])
  argListString <- if(length(astList) > 1) getArgList(tail(astList,-1)) else character(0)
  sprintf("StdCall(%s,%s)",callExprString,argListString)
}

getFunctionDef <- function(astlist) {
  paramListString <- getParamList(astList[[2]])
  bodyString <- processExpr(astList[[3]])
  sprintf("FunctionDef(%s,%s)",paramListString,bodyString)
}

##Uggh!! need to fix these
getArgList <- function(astList) {
  argList <- sapply(1:length(astList),function(i) {
    argExprText <- processExpr(astList[[i]])
    if((!is.null(names(astList)))&&(names(astList)[i] != "")) {
      sprintf('ArgValue(Identifier,"=",%s)',argExprText)
    }
    else {
      sprintf('ArgValue(%s)',argExprText)
    }
  })
  sprintf("ArgList(%s)",paste(argList,collapse=","))
}

getParamList <- function(astEntry) {
  astList = as.list(astEntry)
  
  paramList <- sapply(1:length(astList),function(i) {
    ##we don't actually use the name, just the "Identifier" token
    if(class(astList[[i]]) != "name") {
      sprint("ParamValue(Identifier,"=",%s)",processExpr(astList[[i]]))
    }
    else {
      "ParamValue(Identifier)"
    }
  })
  sprintf("ParamList,(%s)",paste(paramList,collapse=","))
}


