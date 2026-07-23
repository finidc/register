-- Initial FINIDC profession and skills catalogue.
-- Employment conditions such as "job seeker" do not belong in this table.
INSERT INTO skills (category, name, active, display_order) VALUES
  ('Arts', 'Musician', 1, 10),
  ('Arts', 'Singer', 1, 20),
  ('Arts', 'Dancer', 1, 30),
  ('Arts', 'Visual Artist', 1, 40),
  ('Arts', 'Photographer', 1, 50),
  ('Arts', 'Event Performer', 1, 60),

  ('Transport', 'Driver', 1, 10),
  ('Transport', 'Delivery', 1, 20),
  ('Transport', 'Logistics', 1, 30),
  ('Transport', 'Bicycle Repair', 1, 40),

  ('Science', 'Mathematics', 1, 10),
  ('Science', 'Physics', 1, 20),
  ('Science', 'Chemistry', 1, 30),
  ('Science', 'Biology', 1, 40),
  ('Science', 'Research Assistance', 1, 50),

  ('Technology', 'Software Development', 1, 10),
  ('Technology', 'Web Development', 1, 20),
  ('Technology', 'Cybersecurity', 1, 30),
  ('Technology', 'Data Analysis', 1, 40),
  ('Technology', 'Artificial Intelligence', 1, 50),
  ('Technology', 'IT Support', 1, 60),
  ('Technology', 'Digital Skills Support', 1, 70),

  ('Services', 'Cleaning', 1, 10),
  ('Services', 'Cooking', 1, 20),
  ('Services', 'Catering', 1, 30),
  ('Services', 'Hair and Beauty', 1, 40),
  ('Services', 'Customer Service', 1, 50),
  ('Services', 'Hospitality', 1, 60),

  ('Education', 'Teacher', 1, 10),
  ('Education', 'Tutor', 1, 20),
  ('Education', 'Language Teaching', 1, 30),
  ('Education', 'Childcare Education', 1, 40),
  ('Education', 'Workshop Facilitation', 1, 50),

  ('Care', 'Elderly Assistance', 1, 10),
  ('Care', 'Childcare', 1, 20),
  ('Care', 'Disability Assistance', 1, 30),
  ('Care', 'Community Support', 1, 40),
  ('Care', 'Peer Support', 1, 50),

  ('Construction and Maintenance', 'Carpentry', 1, 10),
  ('Construction and Maintenance', 'Painting', 1, 20),
  ('Construction and Maintenance', 'Electrical Work', 1, 30),
  ('Construction and Maintenance', 'Plumbing', 1, 40),
  ('Construction and Maintenance', 'General Maintenance', 1, 50),

  ('Business and Administration', 'Accounting', 1, 10),
  ('Business and Administration', 'Marketing', 1, 20),
  ('Business and Administration', 'Sales', 1, 30),
  ('Business and Administration', 'Project Management', 1, 40),
  ('Business and Administration', 'Office Administration', 1, 50),
  ('Business and Administration', 'Entrepreneurship', 1, 60),

  ('Languages and Communication', 'Translation', 1, 10),
  ('Languages and Communication', 'Interpretation', 1, 20),
  ('Languages and Communication', 'Writing and Editing', 1, 30),
  ('Languages and Communication', 'Social Media', 1, 40),
  ('Languages and Communication', 'Public Speaking', 1, 50),

  ('Community and Events', 'Event Planning', 1, 10),
  ('Community and Events', 'Event Assistance', 1, 20),
  ('Community and Events', 'Volunteering Coordination', 1, 30),
  ('Community and Events', 'Community Gardening', 1, 40),
  ('Community and Events', 'Nature Activity Guide', 1, 50),
  ('Community and Events', 'City Guide', 1, 60);
