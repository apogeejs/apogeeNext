m <- matrix(1:8,nrow=2)
rownames(m) <- c("r1","r2")
m2 <- m

dimnames(m2) <- list(rs=c("r1","r2"))
m3 <- m2
dimnames(m2) <- list(rs=c("r1","r2"),cs=c("c1",NA,"c3","c4"))
m3 <- m2

