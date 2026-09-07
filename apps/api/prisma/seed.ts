import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("vaquita123", 10);

  const [valentina, magdalena, juani, fer, luli, tomy] = await Promise.all(
    [
      { name: "Valentina", email: "valentina@lavaquita.app" },
      { name: "Magdalena", email: "magdalena@lavaquita.app" },
      { name: "Juani", email: "juani@lavaquita.app" },
      { name: "Fer", email: "fer@lavaquita.app" },
      { name: "Luli", email: "luli@lavaquita.app" },
      { name: "Tomy", email: "tomy@lavaquita.app" },
    ].map((u) => prisma.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: password } }))
  );

  const trip = await prisma.trip.create({
    data: {
      name: "Bariloche 2025",
      description: "Viaje grupal a Bariloche",
      startDate: new Date("2025-07-10"),
      endDate: new Date("2025-07-20"),
      createdById: valentina.id,
      members: {
        create: [valentina, magdalena, juani, fer, luli, tomy].map((u, i) => ({
          userId: u.id,
          role: i === 0 ? "ORGANIZER" : "MEMBER",
        })),
      },
      categories: {
        create: [
          { name: "Alimentación", icon: "utensils", color: "#22a559" },
          { name: "Transporte", icon: "car", color: "#3b82f6" },
          { name: "Alojamiento", icon: "home", color: "#a855f7" },
          { name: "Ocio", icon: "sparkles", color: "#f97316" },
          { name: "Otros", icon: "dots", color: "#ef4444" },
        ],
      },
    },
    include: { categories: true, members: true },
  });

  const cat = (name: string) => trip.categories.find((c) => c.name === name)!.id;
  const everyone = [valentina, magdalena, juani, fer, luli, tomy].map((u) => u.id);

  const equalSplit = (amount: number) => {
    const base = Math.floor((amount / everyone.length) * 100) / 100;
    const splits = everyone.map((userId) => ({ userId, amountOwed: base }));
    splits[0].amountOwed += Math.round((amount - base * everyone.length) * 100) / 100;
    return splits;
  };

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      description: "Supermercado",
      amount: 18600,
      categoryId: cat("Alimentación"),
      paidById: valentina.id,
      createdById: valentina.id,
      expenseDate: new Date(),
      splits: { create: equalSplit(18600) },
    },
  });

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      description: "Cena en restaurante",
      amount: 24000,
      categoryId: cat("Alimentación"),
      paidById: valentina.id,
      createdById: valentina.id,
      expenseDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      splits: { create: equalSplit(24000) },
    },
  });

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      description: "Combustible",
      amount: 8450,
      categoryId: cat("Transporte"),
      paidById: juani.id,
      createdById: juani.id,
      expenseDate: new Date("2025-07-12"),
      splits: { create: equalSplit(8450) },
    },
  });

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      description: "Paseo en barco",
      amount: 15000,
      categoryId: cat("Ocio"),
      paidById: fer.id,
      createdById: fer.id,
      expenseDate: new Date("2025-07-11"),
      splits: { create: equalSplit(15000) },
    },
  });

  await prisma.expense.create({
    data: {
      tripId: trip.id,
      description: "Alquiler de cabaña",
      amount: 120000,
      categoryId: cat("Alojamiento"),
      paidById: magdalena.id,
      createdById: magdalena.id,
      expenseDate: new Date("2025-07-10"),
      splits: { create: equalSplit(120000) },
    },
  });

  await prisma.task.createMany({
    data: [
      { tripId: trip.id, title: "Cocinar cena", assignedToId: magdalena.id, dueDate: new Date("2025-07-15"), createdById: valentina.id },
      { tripId: trip.id, title: "Lavar los platos", assignedToId: juani.id, dueDate: new Date("2025-07-15"), createdById: valentina.id },
      { tripId: trip.id, title: "Limpiar espacios comunes", assignedToId: luli.id, dueDate: new Date("2025-07-16"), createdById: valentina.id },
    ],
  });

  console.log("Seed completo. Viaje de ejemplo:", trip.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
