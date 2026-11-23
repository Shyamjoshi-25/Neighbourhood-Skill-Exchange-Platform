import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import HelpRequest from './models/HelpRequest.js';

const PASSWORD = 'Password@123';
const AREA = 'Green park'; // must match the neighbourhood of the account you log in with
const CITY = 'Nashik';
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// [name, email prefix, profession, skills, bio, availability, verified]
const userRows = [
  ['Dr. Vikram Deshpande', 'vikram', 'Dentist', ['Healthcare', 'Dental Care'], 'Dental advice and first response for tooth emergencies.', 'Available', true],
  ['Priya Kulkarni', 'priya', 'Nurse', ['Healthcare', 'Elderly Care'], 'Home nursing and elderly care guidance.', 'Available', true],
  ['Sunil Bhosale', 'sunil', 'Electrician', ['Electrical', 'Inverter Repair'], 'Wiring, inverters and fan or light repair.', 'Busy', true],
  ['Anita Shinde', 'anita', 'Teacher', ['Education', 'English'], 'English teacher, spoken English practice.', 'Available', false],
  ['Prakash Thakur', 'prakash', 'Plumber', ['Plumbing'], 'Taps, pipes and drainage repair.', 'Available', false],
  ['Adv. Meenal Gokhale', 'meenal', 'Lawyer', ['Legal', 'Consumer Law'], 'Consumer, tenant and family law advice.', 'Available', true],
  ['Karan Mehta', 'karan', 'Web Developer', ['Computer & Technology', 'Web Development'], 'Websites, apps and online tools for small business.', 'Available', true],
  ['Farhan Pathan', 'farhan', 'AC Technician', ['Electrical', 'Appliance Repair'], 'AC, fridge and washing machine repair.', 'Available', false],
  ['Shweta Nikam', 'shweta', 'Chartered Accountant', ['Finance', 'Tax Filing'], 'Income tax and GST guidance.', 'Available', true],
  ['Ganesh Dhone', 'ganesh', 'Carpenter', ['Carpentry'], 'Furniture repair and fitting.', 'Available', false],
  ['Sneha Bhalerao', 'sneha', 'Physiotherapist', ['Healthcare', 'Fitness'], 'Back pain, posture and recovery exercises.', 'Available', true],
  ['Rajesh Kale', 'rajesh', 'Mechanic', ['Vehicle Repair', 'Other'], 'Two wheeler and car basic repair.', 'Busy', false],
  ['Pallavi Kadam', 'pallavi', 'Translator', ['Translation', 'Marathi Hindi English'], 'Document translation between Marathi, Hindi and English.', 'Available', false],
  ['Yogesh Salunke', 'yogesh', 'Fitness Trainer', ['Fitness'], 'Home workouts and diet basics.', 'Available', false],
  ['Dr. Nikhil Phadke', 'nikhil', 'Pediatrician', ['Healthcare', 'Child Care'], 'Child health advice for common illness and emergencies.', 'Available', true],
  ['Swati Chavan', 'swati', 'Tutor', ['Education', 'Science'], 'Science tutor for classes 8 to 10.', 'Available', true],
  ['Mahesh Wagh', 'mahesh', 'Network Technician', ['Computer & Technology', 'WiFi Setup'], 'Router, WiFi and CCTV setup.', 'Available', false],
  ['Vandana Joshi', 'vandana', 'Counsellor', ['Community Support', 'Counselling'], 'Listening and guidance on stress and study pressure.', 'Available', true],
  ['Tushar Bhosale', 'tushar', 'Painter', ['Painting', 'Other'], 'House painting and wall damp treatment.', 'Busy', false],
  ['Lata Pagar', 'lata', 'Tailor', ['Tailoring', 'Other'], 'Stitching and alterations.', 'Available', false],
  ['Akash Kolhe', 'akash', '', [], '', 'Available', false],
  ['Rina Bansode', 'rina', '', [], '', 'Available', false],
  ['Dinesh Rathod', 'dinesh', '', [], '', 'Available', false],
  ['Mansi Sonawane', 'mansi', '', [], '', 'Available', false],
  ['Harsh Kothari', 'harsh', '', [], '', 'Available', false],
  ['Jyoti Gaikwad', 'jyoti', '', [], '', 'Available', false],
  ['Vishal Ingle', 'vishal', '', [], '', 'Available', false],
  ['Pooja Mahajan', 'pooja', '', [], '', 'Available', false],
  ['Nitin Aher', 'nitin', '', [], '', 'Available', false],
  ['Sakshi Pardeshi', 'sakshi', '', [], '', 'Available', false],
];

// [requester, helper (null if pending or declined), title, description, skill, urgency, status, days ago]
const requestRows = [
  ['akash', 'vikram', 'Severe toothache since last night', 'Pain is increasing and my cheek is swollen. Is it safe to wait until morning?', 'Healthcare', 'Urgent', 'Completed', 5],
  ['rina', 'priya', 'Need help caring for bedridden mother', 'Looking for guidance on turning and feeding a bedridden elderly patient at home.', 'Healthcare', 'Normal', 'Accepted', 2],
  ['dinesh', 'sunil', 'Inverter not charging the battery', 'Inverter beeps continuously and the battery shows no charge.', 'Electrical', 'Urgent', 'Accepted', 1],
  ['mansi', null, 'Spoken English practice for interview', 'Need a few practice sessions for an upcoming job interview.', 'Education', 'Normal', 'Pending', 2],
  ['harsh', 'prakash', 'Bathroom tap will not stop dripping', 'The tap drips all night. Is it only a washer problem?', 'Plumbing', 'Normal', 'Completed', 8],
  ['jyoti', 'meenal', 'Shop refused to refund a faulty phone', 'Bought a phone last week and it stopped working. The shop refuses a refund.', 'Legal', 'Normal', 'Accepted', 3],
  ['vishal', null, 'Need a simple portfolio website', 'Final year student, want a one page portfolio to share with recruiters.', 'Computer & Technology', 'Normal', 'Pending', 4],
  ['pooja', 'farhan', 'AC is not cooling properly', 'Split AC runs but the room does not cool. Gas leak or dirty filter?', 'Electrical', 'Normal', 'Completed', 10],
  ['nitin', null, 'Help filing income tax return', 'First time filing ITR with salary and a small FD income.', 'Finance', 'Normal', 'Pending', 2],
  ['sakshi', 'ganesh', 'Bed frame cracked on one side', 'The wooden bed frame cracked near the leg and creaks badly.', 'Carpentry', 'Normal', 'Accepted', 6],
  ['akash', 'sneha', 'Lower back pain after long study hours', 'Constant back pain after sitting for long hours, need safe exercises.', 'Healthcare', 'Normal', 'Completed', 11],
  ['rina', 'rajesh', 'Scooter will not start in the morning', 'The scooter does not start unless I kick several times.', 'Other', 'Urgent', 'Completed', 3],
  ['dinesh', null, 'Translate a rent agreement to Marathi', 'Need a Marathi translation of a two page agreement.', 'Translation', 'Normal', 'Pending', 1],
  ['mansi', 'yogesh', 'Beginner workout plan for weight loss', 'Need a safe plan with no gym equipment.', 'Fitness', 'Normal', 'Accepted', 4],
  ['harsh', 'nikhil', 'Baby has cough and mild fever', 'My 8 month old has had a cough and 100F fever since yesterday.', 'Healthcare', 'Emergency', 'Completed', 2],
  ['jyoti', null, 'Help with class 10 science before pre-boards', 'Need revision for physics numericals.', 'Education', 'Normal', 'Pending', 3],
  ['vishal', 'mahesh', 'WiFi keeps disconnecting every hour', 'Router lights blink and the internet drops every hour.', 'Computer & Technology', 'Urgent', 'Completed', 5],
  ['pooja', 'vandana', 'Feeling very stressed before exams', 'Need someone to talk to about exam stress and sleep.', 'Community Support', 'Normal', 'Accepted', 1],
  ['nitin', null, 'Damp patch and peeling paint on wall', 'Paint is peeling on the bedroom wall after the rains.', 'Other', 'Normal', 'Pending', 7],
  ['sakshi', 'lata', 'Blouse alteration needed urgently', 'Need an alteration before a wedding this weekend.', 'Other', 'Urgent', 'Completed', 2],
  ['vikram', null, 'Clinic lights flicker', 'The clinic lights flicker whenever the AC turns on.', 'Electrical', 'Normal', 'Pending', 3],
  ['priya', null, 'Tenant is not vacating the flat', 'Our tenant refuses to vacate after the agreement ended.', 'Legal', 'Urgent', 'Pending', 2],
  ['anita', 'karan', 'Need help setting up online classes', 'Want to start online classes using free tools.', 'Computer & Technology', 'Normal', 'Completed', 9],
  ['prakash', 'shweta', 'GST registration for small shop', 'Need guidance on whether GST registration is required.', 'Finance', 'Normal', 'Accepted', 4],
  ['ganesh', null, 'Refrigerator makes loud noise', 'Fridge makes a loud humming noise at night.', 'Electrical', 'Normal', 'Declined', 6],
  ['sneha', 'pallavi', 'Letter to be translated into English', 'Need a formal letter converted from Hindi to English.', 'Translation', 'Normal', 'Completed', 8],
  ['rajesh', null, 'Knee exercises after injury', 'Recovering from a minor sprain, need safe strengthening exercises.', 'Fitness', 'Normal', 'Pending', 2],
  ['mahesh', 'nikhil', 'Child keeps getting stomach pain', 'My 6 year old daughter complains of stomach pain after meals.', 'Healthcare', 'Urgent', 'Accepted', 1],
  ['vandana', null, 'Tuition for class 8 maths', 'Looking for a weekend tutor for class 8 maths.', 'Education', 'Normal', 'Pending', 5],
  ['tushar', null, 'Need two shelves fitted on wall', 'Want two wooden shelves fitted in the living room.', 'Carpentry', 'Normal', 'Declined', 10],
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const emails = userRows.map((u) => `${u[1]}@gmail.com`);
  const old = await User.find({ email: { $in: emails } }).select('_id');
  const oldIds = old.map((u) => u._id);
  await HelpRequest.deleteMany({ $or: [{ requester: { $in: oldIds } }, { helper: { $in: oldIds } }] });
  await User.deleteMany({ _id: { $in: oldIds } });

  const hash = await bcrypt.hash(PASSWORD, 12);
  const created = {};
  for (const [name, key, profession, skills, bio, availability, verified] of userRows) {
    created[key] = await User.create({
      name,
      email: `${key}@gmail.com`,
      password: hash,
      area: AREA,
      city: CITY,
      profession,
      skills,
      bio,
      availability,
      verified,
      role: profession || skills.length ? 'skilled_member' : 'user',
    });
  }

  for (const [by, to, title, description, skillRequired, urgency, status, age] of requestRows) {
    await HelpRequest.create({
      title,
      description,
      skillRequired,
      urgency,
      status,
      area: AREA,
      requester: created[by]._id,
      helper: to ? created[to]._id : undefined,
      createdAt: daysAgo(age),
    });
  }

  console.log(`Added ${userRows.length} users and ${requestRows.length} requests in "${AREA}".`);
  console.log(`Log in with any of them, for example vikram@gmail.com / ${PASSWORD}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});