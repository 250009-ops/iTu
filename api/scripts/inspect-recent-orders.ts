import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const orders = await prisma.order.findMany({
  orderBy: { createdAt: 'desc' },
  take: 8,
  select: {
    orderCode: true,
    checkoutUrl: true,
    lemonCheckoutId: true,
    status: true,
    createdAt: true,
  },
});
console.log(JSON.stringify(orders, null, 2));
await prisma.$disconnect();
