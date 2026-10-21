// Department names follow TCET's published programme list.
export const DEPARTMENTS = [
  "Computer Engineering",
  "Information Technology",
  "Electronics & Tele-Communication",
  "Electronics and Computer Science",
  "Mechanical Engineering",
  "Civil Engineering",
  "Computer Science and Engineering (Cyber Security)",
  "Mechanical and Mechatronics Engineering (Additive Manufacturing)",
  "Artificial Intelligence & Machine Learning",
  "Artificial Intelligence & Data Science",
  "Computer Science and Engineering (IoT)",
] as const;

export function isDepartment(value: string): boolean {
  return (DEPARTMENTS as readonly string[]).includes(value);
}
