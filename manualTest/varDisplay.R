n <- 100
x <- rnorm(100)
lst <- list(a=1,b=2,c=3)
lst2 <- list(1,2,3)
list3 <- list(a=1,2,3)
df <- data.frame(a=1:5,b=rnorm(5),c=rep(TRUE,5))
colnames(df) <- NULL
df2 <- df
f <- factor(c("a","b","c"))
f2 <- ordered(c("a","b","c"))
m <- matrix(1:8,nrow=2)
a <- array(1:16,dim=c(2,4,2))
foo <- function(x,y,z=5,...) TRUE
output <- table(f)
output


