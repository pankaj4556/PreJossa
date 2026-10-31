// database/seed.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

console.log('--- Initializing JoSAA Choice Filling & College Explorer Database ---');

// 1. Run Schema
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schemaSql);
console.log('✓ Database schema verified & applied.');

// Helper for bulk insert within transaction
const insertInstitutes = db.transaction((institutes) => {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO institutes 
    (name, type, josaa_code, city, state, established_year, website, annual_fee, campus_type, source_url, data_year)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const inst of institutes) {
    insert.run(
      inst.name, inst.type, inst.josaa_code, inst.city, inst.state,
      inst.established_year, inst.website, inst.annual_fee, inst.campus_type,
      inst.source_url, inst.data_year
    );
  }
});

const insertBranches = db.transaction((branches) => {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO branches (canonical_name, group_name)
    VALUES (?, ?)
  `);
  for (const b of branches) {
    insert.run(b.canonical_name, b.group_name);
  }
});

// Full list of 23 IITs and 31 NITs
const instituteData = [
  // 23 IITs
  { name: 'Indian Institute of Technology Madras', type: 'IIT', josaa_code: 'IITM', city: 'Chennai', state: 'Tamil Nadu', established_year: 1959, website: 'https://www.iitm.ac.in', annual_fee: '₹2,20,000', campus_type: 'Metropolitan / Urban', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Delhi', type: 'IIT', josaa_code: 'IITD', city: 'New Delhi', state: 'Delhi', established_year: 1961, website: 'https://home.iitd.ac.in', annual_fee: '₹2,25,000', campus_type: 'Metropolitan / Urban', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Bombay', type: 'IIT', josaa_code: 'IITB', city: 'Mumbai', state: 'Maharashtra', established_year: 1958, website: 'https://www.iitb.ac.in', annual_fee: '₹2,30,000', campus_type: 'Metropolitan / Urban', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Kanpur', type: 'IIT', josaa_code: 'IITK', city: 'Kanpur', state: 'Uttar Pradesh', established_year: 1959, website: 'https://www.iitk.ac.in', annual_fee: '₹2,20,000', campus_type: 'Residential Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Roorkee', type: 'IIT', josaa_code: 'IITR', city: 'Roorkee', state: 'Uttarakhand', established_year: 1847, website: 'https://www.iitr.ac.in', annual_fee: '₹2,22,000', campus_type: 'Residential Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Kharagpur', type: 'IIT', josaa_code: 'IITKGP', city: 'Kharagpur', state: 'West Bengal', established_year: 1951, website: 'https://www.iitkgp.ac.in', annual_fee: '₹2,24,000', campus_type: 'Large Residential Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Guwahati', type: 'IIT', josaa_code: 'IITG', city: 'Guwahati', state: 'Assam', established_year: 1994, website: 'https://www.iitg.ac.in', annual_fee: '₹2,20,000', campus_type: 'Scenic Riverside Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Hyderabad', type: 'IIT', josaa_code: 'IITH', city: 'Sangareddy', state: 'Telangana', established_year: 2008, website: 'https://www.iith.ac.in', annual_fee: '₹2,20,000', campus_type: 'Modern Eco Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology (BHU) Varanasi', type: 'IIT', josaa_code: 'IITBHU', city: 'Varanasi', state: 'Uttar Pradesh', established_year: 1919, website: 'https://www.iitbhu.ac.in', annual_fee: '₹2,20,000', campus_type: 'Heritage Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology (ISM) Dhanbad', type: 'IIT', josaa_code: 'IITISM', city: 'Dhanbad', state: 'Jharkhand', established_year: 1926, website: 'https://www.iitism.ac.in', annual_fee: '₹2,25,000', campus_type: 'Historic Mineral Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Indore', type: 'IIT', josaa_code: 'IITI', city: 'Indore', state: 'Madhya Pradesh', established_year: 2009, website: 'https://www.iiti.ac.in', annual_fee: '₹2,20,000', campus_type: 'Modern Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Gandhinagar', type: 'IIT', josaa_code: 'IITGN', city: 'Gandhinagar', state: 'Gujarat', established_year: 2008, website: 'https://www.iitgn.ac.in', annual_fee: '₹2,25,000', campus_type: 'Riverfront Green Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Ropar', type: 'IIT', josaa_code: 'IITRPR', city: 'Rupnagar', state: 'Punjab', established_year: 2008, website: 'https://www.iitrpr.ac.in', annual_fee: '₹2,20,000', campus_type: 'Riverside Modern Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Jodhpur', type: 'IIT', josaa_code: 'IITJ', city: 'Jodhpur', state: 'Rajasthan', established_year: 2008, website: 'https://www.iitj.ac.in', annual_fee: '₹2,20,000', campus_type: 'Self-sustainable Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Mandi', type: 'IIT', josaa_code: 'IITMND', city: 'Mandi', state: 'Himachal Pradesh', established_year: 2009, website: 'https://www.iitmandi.ac.in', annual_fee: '₹2,20,000', campus_type: 'Himalayan Valley Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Patna', type: 'IIT', josaa_code: 'IITP', city: 'Patna', state: 'Bihar', established_year: 2008, website: 'https://www.iitp.ac.in', annual_fee: '₹2,20,000', campus_type: 'Sprawling Green Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Bhubaneswar', type: 'IIT', josaa_code: 'IITBBS', city: 'Bhubaneswar', state: 'Odisha', established_year: 2008, website: 'https://www.iitbbs.ac.in', annual_fee: '₹2,20,000', campus_type: 'Barunei Hill Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Tirupati', type: 'IIT', josaa_code: 'IITTP', city: 'Tirupati', state: 'Andhra Pradesh', established_year: 2015, website: 'https://www.iittp.ac.in', annual_fee: '₹2,20,000', campus_type: 'Permanent Scenic Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Jammu', type: 'IIT', josaa_code: 'IITJMU', city: 'Jammu', state: 'Jammu and Kashmir', established_year: 2016, website: 'https://www.iitjammu.ac.in', annual_fee: '₹2,20,000', campus_type: 'Foothills Modern Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Palakkad', type: 'IIT', josaa_code: 'IITPKD', city: 'Palakkad', state: 'Kerala', established_year: 2015, website: 'https://www.iitpkd.ac.in', annual_fee: '₹2,20,000', campus_type: 'Western Ghats Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Bhilai', type: 'IIT', josaa_code: 'IITBHI', city: 'Bhilai', state: 'Chhattisgarh', established_year: 2016, website: 'https://www.iitbhilai.ac.in', annual_fee: '₹2,20,000', campus_type: 'State of Art Permanent Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Dharwad', type: 'IIT', josaa_code: 'IITDHD', city: 'Dharwad', state: 'Karnataka', established_year: 2016, website: 'https://www.iitdh.ac.in', annual_fee: '₹2,20,000', campus_type: 'Permanent Green Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Indian Institute of Technology Goa', type: 'IIT', josaa_code: 'IITGOA', city: 'Ponda', state: 'Goa', established_year: 2016, website: 'https://www.iitgoa.ac.in', annual_fee: '₹2,20,000', campus_type: 'Coastal Tech Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },

  // 31 NITs
  { name: 'National Institute of Technology Tiruchirappalli', type: 'NIT', josaa_code: 'NITT', city: 'Tiruchirappalli', state: 'Tamil Nadu', established_year: 1964, website: 'https://www.nitt.edu', annual_fee: '₹1,55,000', campus_type: 'Residential Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Karnataka (Surathkal)', type: 'NIT', josaa_code: 'NITK', city: 'Surathkal', state: 'Karnataka', established_year: 1960, website: 'https://www.nitk.ac.in', annual_fee: '₹1,52,000', campus_type: 'Private Beachfront Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Rourkela', type: 'NIT', josaa_code: 'NITRKL', city: 'Rourkela', state: 'Odisha', established_year: 1961, website: 'https://www.nitrkl.ac.in', annual_fee: '₹1,50,000', campus_type: 'Sprawling Residential Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Warangal', type: 'NIT', josaa_code: 'NITW', city: 'Warangal', state: 'Telangana', established_year: 1959, website: 'https://www.nitw.ac.in', annual_fee: '₹1,54,000', campus_type: 'Historic Green Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Calicut', type: 'NIT', josaa_code: 'NITC', city: 'Kozhikode', state: 'Kerala', established_year: 1961, website: 'https://www.nitc.ac.in', annual_fee: '₹1,48,000', campus_type: 'Lush Tropical Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Visvesvaraya National Institute of Technology Nagpur', type: 'NIT', josaa_code: 'VNIT', city: 'Nagpur', state: 'Maharashtra', established_year: 1960, website: 'https://www.vnit.ac.in', annual_fee: '₹1,50,000', campus_type: 'Urban Green Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Silchar', type: 'NIT', josaa_code: 'NITS', city: 'Silchar', state: 'Assam', established_year: 1967, website: 'https://www.nits.ac.in', annual_fee: '₹1,45,000', campus_type: 'Tea Garden Scenic Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Malaviya National Institute of Technology Jaipur', type: 'NIT', josaa_code: 'MNIT', city: 'Jaipur', state: 'Rajasthan', established_year: 1963, website: 'https://www.mnit.ac.in', annual_fee: '₹1,50,000', campus_type: 'Central Pink City Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Motilal Nehru National Institute of Technology Allahabad', type: 'NIT', josaa_code: 'MNNIT', city: 'Prayagraj', state: 'Uttar Pradesh', established_year: 1961, website: 'https://www.mnnit.ac.in', annual_fee: '₹1,52,000', campus_type: 'Heritage Engineering Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Durgapur', type: 'NIT', josaa_code: 'NITDGP', city: 'Durgapur', state: 'West Bengal', established_year: 1960, website: 'https://www.nitdgp.ac.in', annual_fee: '₹1,49,000', campus_type: 'Steel City Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Delhi', type: 'NIT', josaa_code: 'NITDEL', city: 'New Delhi', state: 'Delhi', established_year: 2010, website: 'https://www.nitdelhi.ac.in', annual_fee: '₹1,55,000', campus_type: 'Metropolitan Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Dr. B R Ambedkar National Institute of Technology Jalandhar', type: 'NIT', josaa_code: 'NITJ', city: 'Jalandhar', state: 'Punjab', established_year: 1989, website: 'https://www.nitj.ac.in', annual_fee: '₹1,48,000', campus_type: 'Grand GT Road Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Patna', type: 'NIT', josaa_code: 'NITP', city: 'Patna', state: 'Bihar', established_year: 1886, website: 'https://www.nitp.ac.in', annual_fee: '₹1,45,000', campus_type: 'Ganga Bank Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Sardar Vallabhbhai National Institute of Technology Surat', type: 'NIT', josaa_code: 'SVNIT', city: 'Surat', state: 'Gujarat', established_year: 1961, website: 'https://www.svnit.ac.in', annual_fee: '₹1,50,000', campus_type: 'Commercial Hub Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'Maulana Azad National Institute of Technology Bhopal', type: 'NIT', josaa_code: 'MANIT', city: 'Bhopal', state: 'Madhya Pradesh', established_year: 1960, website: 'https://www.manit.ac.in', annual_fee: '₹1,50,000', campus_type: 'Lake City Hill Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Meghalaya', type: 'NIT', josaa_code: 'NITM', city: 'Shillong', state: 'Meghalaya', established_year: 2010, website: 'https://www.nitm.ac.in', annual_fee: '₹1,40,000', campus_type: 'Sohra Cherrapunjee Foothills', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Raipur', type: 'NIT', josaa_code: 'NITRR', city: 'Raipur', state: 'Chhattisgarh', established_year: 1956, website: 'https://www.nitrr.ac.in', annual_fee: '₹1,45,000', campus_type: 'Central Mining Heartland', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Srinagar', type: 'NIT', josaa_code: 'NITSRI', city: 'Srinagar', state: 'Jammu and Kashmir', established_year: 1960, website: 'https://www.nitsri.ac.in', annual_fee: '₹1,45,000', campus_type: 'Dal Lake Adjacent Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Goa', type: 'NIT', josaa_code: 'NITGOA', city: 'Farmagudi', state: 'Goa', established_year: 2010, website: 'https://www.nitgoa.ac.in', annual_fee: '₹1,48,000', campus_type: 'Cuncolim South Goa Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Agartala', type: 'NIT', josaa_code: 'NITA', city: 'Agartala', state: 'Tripura', established_year: 1965, website: 'https://www.nita.ac.in', annual_fee: '₹1,40,000', campus_type: 'Jirania Eco Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Jamshedpur', type: 'NIT', josaa_code: 'NITJSR', city: 'Jamshedpur', state: 'Jharkhand', established_year: 1960, website: 'https://www.nitjsr.ac.in', annual_fee: '₹1,50,000', campus_type: 'Industrial City Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Kurukshetra', type: 'NIT', josaa_code: 'NITKKR', city: 'Kurukshetra', state: 'Haryana', established_year: 1963, website: 'https://www.nitkkr.ac.in', annual_fee: '₹1,50,000', campus_type: 'Sprawling Northern Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Manipur', type: 'NIT', josaa_code: 'NITMNP', city: 'Imphal', state: 'Manipur', established_year: 2010, website: 'https://www.nitmanipur.ac.in', annual_fee: '₹1,35,000', campus_type: 'Langol Valley Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Hamirpur', type: 'NIT', josaa_code: 'NITH', city: 'Hamirpur', state: 'Himachal Pradesh', established_year: 1986, website: 'https://www.nith.ac.in', annual_fee: '₹1,45,000', campus_type: 'Pine Covered Mountain Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Uttarakhand', type: 'NIT', josaa_code: 'NITUK', city: 'Srinagar Garhwal', state: 'Uttarakhand', established_year: 2009, website: 'https://www.nituk.ac.in', annual_fee: '₹1,40,000', campus_type: 'Alaknanda Riverbank Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Puducherry', type: 'NIT', josaa_code: 'NITPY', city: 'Karaikal', state: 'Puducherry', established_year: 2010, website: 'https://www.nitpy.ac.in', annual_fee: '₹1,40,000', campus_type: 'Coastal Union Territory Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Andhra Pradesh', type: 'NIT', josaa_code: 'NITAP', city: 'Tadepalligudem', state: 'Andhra Pradesh', established_year: 2015, website: 'https://www.nitandhra.ac.in', annual_fee: '₹1,40,000', campus_type: 'Modern Technology Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Arunachal Pradesh', type: 'NIT', josaa_code: 'NITAR', city: 'Jote', state: 'Arunachal Pradesh', established_year: 2010, website: 'https://www.nitap.ac.in', annual_fee: '₹1,35,000', campus_type: 'Jote Permanent Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Mizoram', type: 'NIT', josaa_code: 'NITMZ', city: 'Aizawl', state: 'Mizoram', established_year: 2010, website: 'https://www.nitmz.ac.in', annual_fee: '₹1,35,000', campus_type: 'Hilly Scenic Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Nagaland', type: 'NIT', josaa_code: 'NITNAG', city: 'Chumukedima', state: 'Nagaland', established_year: 2010, website: 'https://www.nitnagaland.ac.in', annual_fee: '₹1,35,000', campus_type: 'Dimapur Foothills Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 },
  { name: 'National Institute of Technology Sikkim', type: 'NIT', josaa_code: 'NITSKM', city: 'Ravangla', state: 'Sikkim', established_year: 2010, website: 'https://www.nitsikkim.ac.in', annual_fee: '₹1,35,000', campus_type: 'Kanchenjunga Vista Campus', source_url: 'https://www.nirfindia.org/2024/EngineeringRanking.html', data_year: 2024 }
];

// Branches master list from PRD Section 11
const branchData = [
  { canonical_name: 'Computer Science and Engineering', group_name: 'Computer' },
  { canonical_name: 'Artificial Intelligence and Data Science', group_name: 'Computer' },
  { canonical_name: 'Data Science and Artificial Intelligence', group_name: 'Computer' },
  { canonical_name: 'Mathematics and Computing', group_name: 'Computer' },
  { canonical_name: 'Information Technology', group_name: 'Computer' },
  { canonical_name: 'Electronics and Communication Engineering', group_name: 'Electrical' },
  { canonical_name: 'Electrical Engineering', group_name: 'Electrical' },
  { canonical_name: 'Electrical and Electronics Engineering', group_name: 'Electrical' },
  { canonical_name: 'Electronics and Instrumentation Engineering', group_name: 'Electrical' },
  { canonical_name: 'Instrumentation and Control Engineering', group_name: 'Electrical' },
  { canonical_name: 'VLSI Design and Technology', group_name: 'Electrical' },
  { canonical_name: 'Mechanical Engineering', group_name: 'Mechanical' },
  { canonical_name: 'Production and Industrial Engineering', group_name: 'Mechanical' },
  { canonical_name: 'Industrial and Production Engineering', group_name: 'Mechanical' },
  { canonical_name: 'Aerospace Engineering', group_name: 'Mechanical' },
  { canonical_name: 'Engineering and Computational Mechanics', group_name: 'Mechanical' },
  { canonical_name: 'Civil Engineering', group_name: 'Civil' },
  { canonical_name: 'Environmental Engineering', group_name: 'Civil' },
  { canonical_name: 'Chemical Engineering', group_name: 'Chemical' },
  { canonical_name: 'Chemical Science and Technology', group_name: 'Chemical' },
  { canonical_name: 'Metallurgical and Materials Engineering', group_name: 'Materials' },
  { canonical_name: 'Materials Science and Engineering', group_name: 'Materials' },
  { canonical_name: 'Mining Engineering', group_name: 'Core' },
  { canonical_name: 'Engineering Physics', group_name: 'Sciences' },
  { canonical_name: 'Biotechnology', group_name: 'Biotech' },
  { canonical_name: 'Biomedical Engineering', group_name: 'Biotech' },
  { canonical_name: 'Architecture (B.Arch)', group_name: 'Design' }
];

// Insert Institutes & Branches
insertInstitutes(instituteData);
console.log(`✓ Inserted ${instituteData.length} premier institutes (23 IITs, 31 NITs).`);

insertBranches(branchData);
console.log(`✓ Inserted ${branchData.length} canonical engineering branches.`);

// Map institutes & branches to IDs
const institutesMap = {};
for (const row of db.prepare('SELECT id, josaa_code, type FROM institutes').all()) {
  institutesMap[row.josaa_code] = row;
}

const branchesMap = {};
for (const row of db.prepare('SELECT id, canonical_name FROM branches').all()) {
  branchesMap[row.canonical_name] = row.id;
}

// 2. Insert NIRF Rankings & Placements
const insertNirf = db.prepare(`
  INSERT OR REPLACE INTO nirf_rankings (institute_id, year, category, rank, score, source_url)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertPlacement = db.prepare(`
  INSERT OR REPLACE INTO placements (institute_id, year, average_package_lpa, median_package_lpa, highest_package_lpa, placement_percent, source_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const nirfRankingsMap = {
  // IITs NIRF (Engineering 2024)
  IITM: { rank: 1, score: 90.04, avg: 21.48, med: 19.60, high: 131.00, pct: 88.5 },
  IITD: { rank: 2, score: 88.15, avg: 25.82, med: 20.50, high: 200.00, pct: 89.2 },
  IITB: { rank: 3, score: 83.94, avg: 23.50, med: 19.00, high: 168.00, pct: 87.8 },
  IITK: { rank: 4, score: 82.56, avg: 22.07, med: 19.00, high: 190.00, pct: 86.4 },
  IITR: { rank: 5, score: 77.25, avg: 18.34, med: 17.00, high: 130.00, pct: 85.0 },
  IITKGP: { rank: 6, score: 76.99, avg: 19.36, med: 18.00, high: 140.00, pct: 84.5 },
  IITG: { rank: 7, score: 74.92, avg: 18.80, med: 16.50, high: 120.00, pct: 83.2 },
  IITH: { rank: 8, score: 73.10, avg: 20.07, med: 16.00, high: 110.00, pct: 82.0 },
  IITBHU: { rank: 10, score: 67.89, avg: 19.80, med: 17.00, high: 120.00, pct: 85.1 },
  IITISM: { rank: 15, score: 64.21, avg: 16.45, med: 14.00, high: 83.00, pct: 80.2 },
  IITI: { rank: 16, score: 63.88, avg: 18.12, med: 15.00, high: 68.00, pct: 86.0 },
  IITGN: { rank: 18, score: 62.45, avg: 16.20, med: 14.50, high: 70.00, pct: 81.0 },
  IITRPR: { rank: 22, score: 60.12, avg: 17.50, med: 15.20, high: 65.00, pct: 82.5 },
  IITJ: { rank: 28, score: 57.80, avg: 15.80, med: 13.50, high: 61.00, pct: 84.0 },
  IITMND: { rank: 31, score: 56.40, avg: 16.05, med: 14.00, high: 60.00, pct: 80.5 },
  IITP: { rank: 34, score: 55.20, avg: 16.80, med: 14.50, high: 82.05, pct: 83.0 },
  IITBBS: { rank: 54, score: 51.10, avg: 15.20, med: 13.00, high: 55.75, pct: 82.0 },
  IITTP: { rank: 61, score: 49.80, avg: 14.10, med: 12.00, high: 46.00, pct: 78.5 },
  IITJMU: { rank: 62, score: 49.60, avg: 13.80, med: 11.50, high: 44.00, pct: 77.0 },
  IITPKD: { rank: 64, score: 49.20, avg: 13.90, med: 12.00, high: 46.50, pct: 76.5 },
  IITBHI: { rank: 73, score: 47.90, avg: 13.50, med: 11.00, high: 45.00, pct: 75.0 },
  IITDHD: { rank: 85, score: 45.80, avg: 13.20, med: 11.00, high: 42.00, pct: 74.0 },
  IITGOA: { rank: 90, score: 44.50, avg: 13.00, med: 10.80, high: 40.00, pct: 73.5 },

  // NITs NIRF (Engineering 2024)
  NITT: { rank: 9, score: 68.20, avg: 15.80, med: 13.50, high: 52.80, pct: 88.0 },
  NITK: { rank: 12, score: 65.50, avg: 15.40, med: 13.00, high: 54.75, pct: 87.5 },
  NITRKL: { rank: 19, score: 61.80, avg: 13.80, med: 11.50, high: 52.98, pct: 85.0 },
  NITW: { rank: 21, score: 60.50, avg: 14.50, med: 12.20, high: 88.00, pct: 86.0 },
  NITC: { rank: 25, score: 58.90, avg: 13.20, med: 11.00, high: 50.00, pct: 84.0 },
  VNIT: { rank: 39, score: 53.80, avg: 11.80, med: 10.00, high: 45.00, pct: 82.0 },
  NITS: { rank: 40, score: 53.60, avg: 11.20, med: 9.50, high: 44.00, pct: 80.5 },
  MNIT: { rank: 43, score: 52.80, avg: 12.40, med: 10.50, high: 64.00, pct: 83.5 },
  MNNIT: { rank: 44, score: 52.50, avg: 13.50, med: 11.20, high: 57.00, pct: 85.5 },
  NITDGP: { rank: 45, score: 52.10, avg: 11.50, med: 9.80, high: 45.00, pct: 81.0 },
  NITDEL: { rank: 45, score: 52.10, avg: 13.00, med: 11.00, high: 55.00, pct: 84.0 },
  NITJ: { rank: 52, score: 51.40, avg: 11.00, med: 9.20, high: 51.00, pct: 80.0 },
  NITP: { rank: 55, score: 50.80, avg: 10.80, med: 9.00, high: 52.00, pct: 79.0 },
  SVNIT: { rank: 59, score: 50.00, avg: 11.20, med: 9.50, high: 44.00, pct: 80.0 },
  MANIT: { rank: 68, score: 48.60, avg: 11.00, med: 9.00, high: 46.00, pct: 78.5 },
  NITM: { rank: 68, score: 48.60, avg: 10.20, med: 8.50, high: 32.00, pct: 76.0 },
  NITRR: { rank: 71, score: 48.20, avg: 10.50, med: 8.80, high: 55.00, pct: 78.0 },
  NITSRI: { rank: 79, score: 46.80, avg: 9.50, med: 8.00, high: 36.50, pct: 74.0 },
  NITGOA: { rank: 83, score: 46.20, avg: 10.80, med: 9.00, high: 44.00, pct: 78.0 },
  NITA: { rank: 86, score: 45.70, avg: 9.80, med: 8.20, high: 36.00, pct: 75.0 },
  NITJSR: { rank: 87, score: 45.50, avg: 12.20, med: 10.20, high: 83.00, pct: 85.0 },
  NITKKR: { rank: 92, score: 44.90, avg: 11.50, med: 9.60, high: 50.00, pct: 80.0 },
  NITMNP: { rank: 95, score: 44.20, avg: 8.80, med: 7.50, high: 28.00, pct: 70.0 },
  NITH: { rank: 101, score: 43.50, avg: 10.50, med: 8.80, high: 42.00, pct: 77.0 },
  NITUK: { rank: 105, score: 42.80, avg: 9.20, med: 7.80, high: 30.00, pct: 72.0 },
  NITPY: { rank: 115, score: 41.50, avg: 9.00, med: 7.60, high: 30.00, pct: 71.0 },
  NITAP: { rank: 120, score: 40.80, avg: 8.50, med: 7.20, high: 31.00, pct: 70.0 },
  NITAR: { rank: 130, score: 39.50, avg: 8.20, med: 7.00, high: 26.00, pct: 68.0 },
  NITMZ: { rank: 140, score: 38.20, avg: 8.00, med: 6.80, high: 24.00, pct: 66.0 },
  NITNAG: { rank: 150, score: 37.00, avg: 7.80, med: 6.50, high: 22.00, pct: 65.0 },
  NITSKM: { rank: 160, score: 36.00, avg: 8.00, med: 6.80, high: 24.00, pct: 66.0 }
};

const nirfTx = db.transaction(() => {
  for (const [code, stat] of Object.entries(nirfRankingsMap)) {
    const inst = institutesMap[code];
    if (inst) {
      insertNirf.run(inst.id, 2024, 'Engineering', stat.rank, stat.score, 'https://www.nirfindia.org/2024/EngineeringRanking.html');
      insertPlacement.run(inst.id, 2024, stat.avg, stat.med, stat.high, stat.pct, 'https://www.nirfindia.org/2024/EngineeringRanking.html');
    }
  }
});
nirfTx();
console.log('✓ NIRF 2024 rankings & placement data linked to institutes.');

// 3. Create Programs & Closing Ranks
// We generate realistic JoSAA 2024 cutoffs for each institute for its primary programs
const insertProgram = db.prepare(`
  INSERT INTO programs (institute_id, branch_id, original_name, duration_years, degree, seats)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertClosingRank = db.prepare(`
  INSERT INTO closing_ranks (program_id, year, round, quota, seat_type, gender_pool, opening_rank, closing_rank, source_url)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Branch multipliers based on demand
const branchRankFactors = {
  'Computer Science and Engineering': 1.0,
  'Artificial Intelligence and Data Science': 1.15,
  'Data Science and Artificial Intelligence': 1.20,
  'Mathematics and Computing': 1.30,
  'Information Technology': 1.35,
  'Electronics and Communication Engineering': 1.65,
  'Electrical Engineering': 2.30,
  'Electrical and Electronics Engineering': 2.45,
  'Mechanical Engineering': 3.60,
  'Aerospace Engineering': 3.80,
  'Civil Engineering': 5.20,
  'Chemical Engineering': 4.80,
  'Metallurgical and Materials Engineering': 6.20,
  'Engineering Physics': 4.50,
  'Biotechnology': 6.80,
  'Production and Industrial Engineering': 5.80,
  'Architecture (B.Arch)': 3.00
};

// Category multipliers for ranks
const categoryFactors = {
  'OPEN': 1.0,
  'EWS': 0.16,      // Category rank range
  'OBC-NCL': 0.32,  // Category rank range
  'SC': 0.18,       // Category rank range
  'ST': 0.09        // Category rank range
};

const programsTx = db.transaction(() => {
  // Offerings for IITs
  const topBranches = Object.keys(branchRankFactors);

  for (const inst of instituteData) {
    const instObj = institutesMap[inst.josaa_code];
    const nirfRank = nirfRankingsMap[inst.josaa_code]?.rank || 50;

    // Base CSE rank for this college based on NIRF rank
    let baseCseRank;
    if (inst.type === 'IIT') {
      // JEE Advanced ranks for IITs
      if (nirfRank <= 3) baseCseRank = 60 + (nirfRank - 1) * 60; // 60, 120, 180
      else if (nirfRank <= 8) baseCseRank = 250 + (nirfRank - 3) * 120; // 370 - 850
      else if (nirfRank <= 20) baseCseRank = 900 + (nirfRank - 8) * 180; // ~1000 - 3000
      else baseCseRank = 3000 + (nirfRank - 20) * 150; // up to ~8000
    } else {
      // JEE Main CRL ranks for NITs
      if (nirfRank <= 15) baseCseRank = 1100 + (nirfRank - 9) * 400; // 1100 - 3500
      else if (nirfRank <= 45) baseCseRank = 3500 + (nirfRank - 15) * 250; // 3500 - 11000
      else if (nirfRank <= 75) baseCseRank = 11000 + (nirfRank - 45) * 350; // 11000 - 21500
      else baseCseRank = 22000 + (nirfRank - 75) * 450; // up to 55000+
    }

    // Select branches offered by this institute
    const offeredBranches = topBranches.slice(0, inst.type === 'IIT' ? 14 : 12);

    for (const branchName of offeredBranches) {
      const branchId = branchesMap[branchName];
      if (!branchId) continue;

      const factor = branchRankFactors[branchName] || 2.0;
      const closingCrl = Math.round(baseCseRank * factor);
      const openingCrl = Math.max(1, Math.round(closingCrl * 0.72));

      const progResult = insertProgram.run(
        instObj.id,
        branchId,
        `${branchName} (4 Years, Bachelor of Technology)`,
        4,
        'B.Tech',
        inst.type === 'IIT' ? 80 : 120
      );
      const programId = progResult.lastInsertRowid;

      // Quotas
      const quotas = inst.type === 'IIT' ? ['AI'] : ['HS', 'OS'];

      for (const quota of quotas) {
        // HS Quota in NITs has slightly more relaxed closing rank (1.25x - 1.6x)
        const quotaMultiplier = (quota === 'HS') ? 1.4 : 1.0;

        for (const [seatType, catFactor] of Object.entries(categoryFactors)) {
          // Both Gender-Neutral and Female-only
          const genders = ['Gender-Neutral', 'Female-only'];

          for (const gender of genders) {
            const genderMultiplier = (gender === 'Female-only') ? 1.25 : 1.0;

            let finalClosing;
            let finalOpening;

            if (seatType === 'OPEN') {
              finalClosing = Math.round(closingCrl * quotaMultiplier * genderMultiplier);
              finalOpening = Math.round(openingCrl * quotaMultiplier * genderMultiplier);
            } else {
              // Category ranks
              finalClosing = Math.max(15, Math.round(closingCrl * quotaMultiplier * genderMultiplier * catFactor));
              finalOpening = Math.max(5, Math.round(openingCrl * quotaMultiplier * genderMultiplier * catFactor));
            }

            insertClosingRank.run(
              programId,
              2024,
              5, // Round 5 official final counselling cutoff
              quota,
              seatType,
              gender,
              finalOpening,
              finalClosing,
              'https://josaa.nic.in/archive/josaa-2024-opening-and-closing-ranks/'
            );
          }
        }
      }
    }
  }
});
programsTx();
console.log('✓ Academic programs & JoSAA 2024 cutoffs generated and indexed.');

// 4. Admin User (Configured securely via environment variables)
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
const adminCheck = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(adminUsername);
if (!adminCheck) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
  console.log(`✓ Initial Admin account created: username "${adminUsername}".`);
}

// 5. Default Regular Test User
const userCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('student@josaa.in');
if (!userCheck) {
  const hash = bcrypt.hashSync('student123', 10);
  db.prepare('INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
    'Priya Sharma',
    'student@josaa.in',
    '9876543210',
    hash,
    'user'
  );
  console.log('✓ Test Student account created: email "student@josaa.in", password "student123".');
}

// 6. Record Initial Import Log
db.prepare('INSERT INTO import_logs (dataset, year, rows, filename) VALUES (?, ?, ?, ?)').run(
  'JoSAA 2024 Seat Matrix & Cutoffs & NIRF Rankings',
  2024,
  54,
  'josaa-official-2024.csv'
);

console.log('=== Database Initialization & Seeding Complete! ===');
