require("dotenv").config();

const mongoose = require("mongoose");
const ServiceInitial = require("./Models/ServiceInitialSchema");
const ServiceProvider = require("./Models/ServiceProviderModel");
const bcrypt = require("bcryptjs");

const serviceData = [
  {
    title: "Teacher",
    discription:
      "Patient local teachers for school support and focused learning.",
    photo:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Babysitter",
    discription: "Responsible, caring support for busy families.",
    photo:
      "https://images.unsplash.com/photo-1602030028438-4cf153cbae9e?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Makeup Artist",
    discription:
      "Professional looks for celebrations, events, and everyday confidence.",
    photo:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
  },
  {
    title: "Driver",
    discription:
      "Dependable local drivers for errands, rides, and daily travel.",
    photo:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=900&q=80",
  },
];

const providerData = [
  {
    name: "Nisha Learning Studio",
    email: "nisha.demo@urbanassist.local",
    mobile: 9876500011,
    jobCategory: "teacher",
    aboutYou:
      "Patient tutoring that makes difficult topics easier to understand.",
    workDescription:
      "School support, homework help, and foundational learning.",
    salary: 700,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Asha Caring Hands",
    email: "asha.demo@urbanassist.local",
    mobile: 9876500012,
    jobCategory: "babysitter",
    aboutYou: "Warm, attentive childcare with a calm and dependable approach.",
    workDescription:
      "After-school care, playtime, meal support, and evening sitting.",
    salary: 600,
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1602030028438-4cf153cbae9e?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Kavya Beauty Studio",
    email: "kavya.demo@urbanassist.local",
    mobile: 9876500013,
    jobCategory: "makeup artist",
    aboutYou: "Event-ready makeup with a personal style consultation included.",
    workDescription: "Party makeup, bridal looks, styling, and makeup lessons.",
    salary: 1200,
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "Vikram City Rides",
    email: "vikram.demo@urbanassist.local",
    mobile: 9876500014,
    jobCategory: "driver",
    aboutYou:
      "Safe and punctual local driving for errands and everyday travel.",
    workDescription:
      "City rides, airport transfers, errands, and scheduled trips.",
    salary: 900,
    rating: 4.7,
    image:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80",
  },
];

async function seed() {
  await mongoose.connect(process.env.mongooseConnectionString);

  await ServiceInitial.deleteMany({
    title: { $nin: serviceData.map((service) => service.title) },
  });
  await ServiceProvider.deleteMany({
    email: {
      $in: [
        "aarav.demo@urbanassist.local",
        "meera.demo@urbanassist.local",
        "rohan.demo@urbanassist.local",
      ],
    },
  });

  for (const service of serviceData) {
    await ServiceInitial.updateOne(
      { title: service.title },
      { $set: service },
      { upsert: true },
    );
  }

  const demoPassword = await bcrypt.hash("demo-password", 10);
  for (const provider of providerData) {
    await ServiceProvider.updateOne(
      { email: provider.email },
      {
        $set: {
          ...provider,
          password: demoPassword,
          role: "ServiceProvider",
          DoB: "1990-01-01",
          gender: "other",
          location: "30.3165,78.0322",
        },
      },
      { upsert: true },
    );
  }

  console.log(
    `Seeded ${serviceData.length} services and ${providerData.length} providers.`,
  );
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Unable to seed demo data", error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
