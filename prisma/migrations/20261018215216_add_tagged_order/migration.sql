-- CreateTable
CREATE TABLE "TaggedOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderName" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "matchedRules" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "TaggedOrder_shop_createdAt_idx" ON "TaggedOrder"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaggedOrder_shop_orderId_key" ON "TaggedOrder"("shop", "orderId");
