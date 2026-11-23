import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import HelpRequest from './models/HelpRequest.js';

const PASSWORD = 'Password@123';
const AREA = 'Green park'; // must match the neighbourhood of the account you log in with
const CITY = 'Nashik';
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const users = [
  { name: 'Dr. Aditi Kulkarni', email: 'aditi@gmail.com', profession: 'Doctor', skills: ['Healthcare', 'First Aid'], bio: 'General physician, happy to guide neighbours in emergencies.', availability: 'Available', verified: true },
  { name: 'Rahul Sharma', email: 'rahul@gmail.com', profession: 'Electrician', skills: ['Electrical', 'Repairs'], bio: '10 years of home wiring and appliance repair.', availability: 'Available', verified: true },
  { name: 'Meera Joshi', email: 'meera@gmail.com', profession: 'Teacher', skills: ['Education', 'Mathematics'], bio: 'Maths teacher for classes 8 to 12.', availability: 'Busy', verified: false },
  { name: 'Adv. Sandeep Patil', email: 'sandeep@gmail.com', profession: 'Lawyer', skills: ['Legal', 'Property Law'], bio: 'Advice on rent, property and consumer matters.', availability: 'Available', verified: true },
  { name: 'Imran Shaikh', email: 'imran@gmail.com', profession: 'Plumber', skills: ['Plumbing', 'Repairs'], bio: 'Leakage, pipe fitting and bathroom work.', availability: 'Available', verified: false },
  { name: 'Neha Wagh', email: 'neha@gmail.com', profession: 'Software Engineer', skills: ['Computer & Technology', 'Web Development'], bio: 'Can help with laptops, phones and websites.', availability: 'Available', verified: true },
  { name: 'Amit Pawar', email: 'amit@gmail.com', profession: 'Carpenter', skills: ['Carpentry', 'Furniture Repair'], bio: 'Furniture repair and custom woodwork.', availability: 'Available', verified: false },
  { name: 'Kavita More', email: 'kavita@gmail.com', profession: '', skills: [], bio: '', availability: 'Available', verified: false },
  { name: 'Rohan Gaikwad', email: 'rohan@gmail.com', profession: '', skills: [], bio: '', availability: 'Available', verified: false },
  { name: 'Suresh Jadhav', email: 'suresh@gmail.com', profession: 'Retired Bank Manager', skills: ['Finance', 'Banking'], bio: 'Guidance on loans, savings and taxes.', availability: 'Available', verified: true },
];

// "by" = requester, "to" = helper (first part of the email); helper is null while pending or declined
const requests = [
  { by: 'kavita', to: 'aditi', title: 'Child has high fever since morning', description: 'My 5 year old has had a fever of 102F since morning. Should we go to the hospital now?', skillRequired: 'Healthcare', urgency: 'Emergency', status: 'Accepted', age: 1 },
  { by: 'rohan', to: 'neha', title: 'Laptop will not boot after update', description: 'My laptop shows a black screen after the Windows update. Need help to recover my project files.', skillRequired: 'Computer & Technology', urgency: 'Normal', status: 'Completed', age: 6 },
  { by: 'kavita', to: 'rahul', title: 'Sparking in kitchen socket', description: 'The socket near the mixer sparks when I plug anything in. I have switched off the main switch.', skillRequired: 'Electrical', urgency: 'Urgent', status: 'Completed', age: 4 },
  { by: 'suresh', to: 'imran', title: 'Water leaking under kitchen sink', description: 'There is a steady leak from the pipe joint under the sink.', skillRequired: 'Plumbing', urgency: 'Urgent', status: 'Accepted', age: 2 },
  { by: 'rohan', to: null, title: 'Help with class 12 trigonometry', description: 'Need someone to explain trigonometry identities before my exam next week.', skillRequired: 'Education', urgency: 'Normal', status: 'Pending', age: 1 },
  { by: 'aditi', to: null, title: 'Advice on rental agreement', description: 'I want to check the notice period and deposit clauses before signing a flat agreement.', skillRequired: 'Legal', urgency: 'Normal', status: 'Pending', age: 3 },
  { by: 'amit', to: 'suresh', title: 'Planning home loan EMI', description: 'Need guidance on choosing a loan tenure and how much EMI is safe on my income.', skillRequired: 'Finance', urgency: 'Normal', status: 'Completed', age: 9 },
  { by: 'meera', to: null, title: 'Wardrobe door hinge broken', description: 'One hinge of the bedroom wardrobe has come off and the door is hanging loose.', skillRequired: 'Carpentry', urgency: 'Normal', status: 'Pending', age: 0 },
  { by: 'neha', to: 'aditi', title: 'Parent has chest pain, need guidance', description: 'My father (68) has mild chest pain and sweating. Ambulance is on the way, need advice meanwhile.', skillRequired: 'Healthcare', urgency: 'Emergency', status: 'Completed', age: 12 },
  { by: 'imran', to: null, title: 'Need a simple website for my plumbing work', description: 'Want a one page website with phone number and service list.', skillRequired: 'Computer & Technology', urgency: 'Normal', status: 'Declined', age: 7 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  // Remove earlier sample data: the old @seed.example.com users and these exact gmail addresses
  const emails = users.map((u) => u.email);
  const old = await User.find({
    $or: [{ email: /@seed\.example\.com$/ }, { email: { $in: emails } }],
  }).select('_id');
  const oldIds = old.map((u) => u._id);
  await HelpRequest.deleteMany({ $or: [{ requester: { $in: oldIds } }, { helper: { $in: oldIds } }] });
  await User.deleteMany({ _id: { $in: oldIds } });

  const hash = await bcrypt.hash(PASSWORD, 12);
  const created = {};
  for (const u of users) {
    const doc = await User.create({
      ...u,
      password: hash,
      area: AREA,
      city: CITY,
      role: u.profession || u.skills.length ? 'skilled_member' : 'user',
    });
    created[u.email.split('@')[0]] = doc;
  }

  for (const r of requests) {
    await HelpRequest.create({
      title: r.title,
      description: r.description,
      skillRequired: r.skillRequired,
      urgency: r.urgency,
      status: r.status,
      area: AREA,
      requester: created[r.by]._id,
      helper: r.to ? created[r.to]._id : undefined,
      createdAt: daysAgo(r.age),
    });
  }

  console.log(`Added ${users.length} users and ${requests.length} requests in "${AREA}".`);
  console.log(`Log in with any of these emails, for example aditi@gmail.com / ${PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});