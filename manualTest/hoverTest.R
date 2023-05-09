## NEEDS WORK!!!
## Hover Testing
## Assign Test
x <- 10
y <- x + 1
z = y + 1
a <<- z + 1
a + 1 -> b
b + 1 ->> d
d <- d + 1
## OOF! The above equation did not update properly in certain cases

## binary
e <- a + b

## unary
a <- -b

lst <- list(a=1,b=2)
letter <- "a"

##subset
lst[letter]
lst[[letter]]

## dollar expr
lst$a
## Dollar RGS nover not implmented

##function call
xxx <- 1:9
mean(x=xxx)
mean(xxx)


{
  lst
}
## list hover didn't work, but I think that is OK? investigate?

## paren
(lst)

##if then
if(x == 10) y else z

##top level ident
lst

##==================
## child block cases
##==================

if(TRUE) {
  aa1 <- 100
  bb1 <- aa1 + 1
  bb1 <- 300
}

{
  aa2 <- 100
  bb2 <- aa2 + 1
  bb2 <- 300
}

aa3 <- 0
while(aa3 < 10) {
  aa3 <- aa3 + 1
}

dd4 <- 1
foo <- function(aa4,bb4=2*aa4,...) {
  dd4 <- dd4 + 1
  cc4 <- bb4 + aa4 + dd4
}
dd4 <- foo(10)








