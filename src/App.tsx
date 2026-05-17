import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from './firebase';


type Status = 'present' | 'absent' | 'late' | 'leave' | 'none';
type View = 'dashboard' | 'attendance' | 'schedule' | 'courses' | 'tasks' | 'grading' | 'students' | 'reports' | 'settings' | 'enrollment' | 'activities' | 'student-profile';

interface CurrentUser {
  role: 'teacher' | 'student';
  username: string; // teacher admin, or studentId
  name: string;
}

interface Scores {
  assignment?: number;
  midterm?: number;
  final?: number;
  [key: string]: number | undefined;
}

interface Student {
  id: number;
  name: string;
  studentId: string;
  class: string;
  status: Status;
  time: string | null;
  scores: Scores;
}

interface AssignmentSubmission {
  studentId: string;
  submittedAt: string;
  content: string;
  status: 'pending' | 'graded';
}

interface Assignment {
  id: number;
  name: string;
  maxScore: number;
  description?: string;
  dueDate?: string;
  submissionMethod?: string;
  learningMaterialUrl?: string;
  submissions?: AssignmentSubmission[];
}

interface Course {
  id: number;
  code: string;
  name: string;
  credits: number;
  periods: number;
  color: string;
  assignments: Assignment[];
  midtermMaxScore: number;
  finalMaxScore: number;
  teacher?: string;
  room?: string;
}

const initialCourses: Course[] = [
  { id: 1, code: 'ว33104', name: 'โลก ดาราศาสตร์ และอวกาศ 1', credits: 1.5, periods: 3, color: 'purple', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 2, code: 'ว30203', name: 'ฟิสิกส์ 3', credits: 1.5, periods: 3, color: 'blue', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 3, code: 'ว30241', name: 'ชีววิทยา 1', credits: 1.5, periods: 3, color: 'green', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 4, code: 'ว23101', name: 'วิทยาศาสตร์พื้นฐาน 5', credits: 1.5, periods: 3, color: 'orange', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 5, code: 'ว30243', name: 'ชีววิทยา', credits: 1.5, periods: 3, color: 'pink', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 6, code: 'ว30201', name: 'ฟิสิกส์ 1', credits: 1.5, periods: 3, color: 'teal', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
  { id: 7, code: 'ว33101', name: 'ฟิสิกส์พื้นฐาน 1', credits: 1.5, periods: 3, color: 'red', assignments: [], midtermMaxScore: 30, finalMaxScore: 30, teacher: 'ครูธวัชชัย', room: 'ห้องเรียน ฟิสิกส์' },
];

const initialEnrollments: Record<number, string[]> = {
  1: ['1367', '1369', '1371', '1373', '1378', '1472', '1473', '1383', '1386', '1474', '1389', '1475'],
  2: ['1393', '1394', '1398', '1400', '1405', '1410', '1411', '1415', '1454', '1417', '1494', '1419', '1495'],
  3: ['1425', '1429', '1448', '1395', '1444'],
  4: ['1455', '1456', '1457', '1458', '1459', '1460', '1461', '1463', '1464', '1465', '1466', '1467', '1468', '1469', '1470', '1471'],
  5: ['1393', '1394', '1398', '1400', '1405', '1410', '1411', '1415', '1454', '1417', '1494', '1419', '1495'],
  6: ['1425', '1429', '1448', '1395', '1444'],
  7: ['1367', '1369', '1371', '1373', '1378', '1472', '1473', '1383', '1386', '1474', '1389', '1475']
};

const initialSchedule: Record<string, (number | null)[]> = {
  'จันทร์': [null, null, null, null, null, null, null, null],
  'อังคาร': [null, null, null, null, null, null, null, null],
  'พุธ': [null, null, null, null, null, null, null, null],
  'พฤหัสบดี': [null, null, null, null, null, null, null, null],
  'ศุกร์': [null, null, null, null, null, null, null, null]
};

const initialStudents: Student[] = [
  { id: 1, name: 'เด็กชายชนาวิน คณะวาปี', studentId: '1496', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 2, name: 'เด็กชายชนินทร์ เชื่อมบุญมา', studentId: '1479', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 3, name: 'เด็กชายชิณภัทร บุญหวาน', studentId: '1497', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 4, name: 'เด็กชายปารเมศ วิเศษไสย์', studentId: '1498', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 5, name: 'เด็กชายปุณณภพ ภาภักดี', studentId: '1499', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 6, name: 'เด็กชายภูตะวัน นัยบุตร', studentId: '1500', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 7, name: 'เด็กหญิงกัญญาภัทร ทองยุ้น', studentId: '1501', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 8, name: 'เด็กหญิงญาดา ศรีคร้าม', studentId: '1502', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 9, name: 'เด็กหญิงณิชานันท์ ศรีเมือง', studentId: '1503', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 10, name: 'เด็กหญิงธัญธิดา อนันต์', studentId: '1504', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 11, name: 'เด็กหญิงนวพร กาสิงห์', studentId: '1505', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 12, name: 'เด็กหญิงปาริชาติ บุญพบ', studentId: '1506', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 13, name: 'เด็กหญิงมุทิตา เป้งทอง', studentId: '1507', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 14, name: 'เด็กหญิงศิริลักษณ์ พงษ์พันเทา', studentId: '1508', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 15, name: 'เด็กหญิงสุวิชาดา จันทศิลา', studentId: '1509', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 16, name: 'เด็กหญิงอภิญญา ชาวเกวียน', studentId: '1510', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 17, name: 'เด็กหญิงอังคณา อินทร์เอม', studentId: '1511', class: 'ม.1', status: 'none', time: null, scores: {} },
  { id: 18, name: 'เด็กชายกฤษฎา กาละพันธ์', studentId: '1477', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 19, name: 'เด็กชายกฤษดากรณ์ มิ่งสอน', studentId: '1478', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 20, name: 'เด็กชายทินภัทร เดิงขุนทด', studentId: '1480', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 21, name: 'เด็กชายนิติรัฐ คำใสย์', studentId: '1481', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 22, name: 'เด็กชายปัญญาภรณ์ มีสิทธิ์', studentId: '1482', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 23, name: 'เด็กชายภานุพงศ์ คำหนูไทย', studentId: '1483', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 24, name: 'เด็กชายสวรินทร์ พิทักษา', studentId: '1484', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 25, name: 'เด็กชายอธิวัฒน์ชัย ปราบภัย', studentId: '1485', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 26, name: 'เด็กชายอัครเดชา สุปัตติ', studentId: '1462', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 27, name: 'เด็กหญิงกัญญารัตน์ สาโดด', studentId: '1487', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 28, name: 'เด็กหญิงธิดารัตน์ นามพล', studentId: '1488', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 29, name: 'เด็กหญิงเบญญาภา แก้วประสงค์', studentId: '1486', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 30, name: 'เด็กหญิงปัชชญา เสลานอก', studentId: '1489', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 31, name: 'เด็กหญิงปาริชาติ สะอาด', studentId: '1490', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 32, name: 'เด็กหญิงสวริน จีนยงค์', studentId: '1491', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 33, name: 'เด็กหญิงสุภัทรา ปิยะวงศ์', studentId: '1492', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 34, name: 'เด็กหญิงอภิสรา พันธ์ขาว', studentId: '1493', class: 'ม.2', status: 'none', time: null, scores: {} },
  { id: 35, name: 'เด็กชายจักรภัทร ตาละ', studentId: '1455', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 36, name: 'เด็กชายฐานะพงษ์ ขันแก้ว', studentId: '1456', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 37, name: 'เด็กชายเตชัส กิ่งแก้ว', studentId: '1457', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 38, name: 'เด็กชายเทวฤทธิ์ พรหมปากดี', studentId: '1458', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 39, name: 'เด็กชายธันญ์กันต์ บุตรใส', studentId: '1459', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 40, name: 'เด็กชายรัชพล ยศบุญ', studentId: '1460', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 41, name: 'เด็กชายอธิชา สิทธิกุล', studentId: '1461', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 42, name: 'เด็กหญิงจันทราพร หาญภิรมย์', studentId: '1463', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 43, name: 'เด็กหญิงจารีรัตน์ กลิ่นจันทร์', studentId: '1464', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 44, name: 'เด็กหญิงจิรัชญา หว่างแสง', studentId: '1465', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 45, name: 'เด็กหญิงชลลดา แสงศร', studentId: '1466', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 46, name: 'เด็กหญิงญานิศา ดวงมาลา', studentId: '1467', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 47, name: 'เด็กหญิงธิชา รุ่งสว่าง', studentId: '1468', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 48, name: 'เด็กหญิงธิดารัตน์ คันธศร', studentId: '1469', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 49, name: 'เด็กหญิงนุชจรี เป้งทอง', studentId: '1470', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 50, name: 'เด็กหญิงอารยา ไชยลา', studentId: '1471', class: 'ม.3', status: 'none', time: null, scores: {} },
  { id: 51, name: 'นายณรงค์ศักดิ์ เกษตะระ', studentId: '1425', class: 'ม.4', status: 'none', time: null, scores: {} },
  { id: 52, name: 'นายธนากร เรียนดารา', studentId: '1429', class: 'ม.4', status: 'none', time: null, scores: {} },
  { id: 53, name: 'นางสาวอนุจรี นวลใส', studentId: '1448', class: 'ม.4', status: 'none', time: null, scores: {} },
  { id: 54, name: 'นายตะวัน รุ่งสว่าง', studentId: '1395', class: 'ม.4', status: 'none', time: null, scores: {} },
  { id: 55, name: 'นางสาวพรทิพย์ นุ่มนวน', studentId: '1444', class: 'ม.4', status: 'none', time: null, scores: {} },
  { id: 56, name: 'นายขวัญชัย เสมอเชื้อ', studentId: '1393', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 57, name: 'นายชินโชติ บัวรินทร์', studentId: '1394', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 58, name: 'นายธีระพล คำเคน', studentId: '1398', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 59, name: 'นายธีระภัทร คำเคน', studentId: '1400', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 60, name: 'นายวชิรวุฒิ กาละพันธ์', studentId: '1405', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 61, name: 'นางสาวจรัณพร อินทร์เอม', studentId: '1410', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 62, name: 'นางสาวณัฏฐนิชา ปราบภัย', studentId: '1411', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 63, name: 'นางสาวปลื้มจิตร อุ่นเสนีย์', studentId: '1415', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 64, name: 'นางสาวพรพรรณ ศิลปชัย', studentId: '1454', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 65, name: 'นางสาวพุธิตา เป้งทอง', studentId: '1417', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 66, name: 'นางสาวมลฑกานต์ ปราบภัย', studentId: '1494', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 67, name: 'นางสาวอรปรียา ป้องกัน', studentId: '1419', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 68, name: 'นางสาววรรณ์พนากาล ยมรัมย์', studentId: '1495', class: 'ม.5', status: 'none', time: null, scores: {} },
  { id: 69, name: 'นายชนะชัย พันธ์ขาว', studentId: '1367', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 70, name: 'นายดนัย มหาราช', studentId: '1369', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 71, name: 'นายนันทวัน ทองสาย', studentId: '1371', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 72, name: 'นายประสิทธ์ นุ่มนวน', studentId: '1373', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 73, name: 'นายศิวัฒน์ คิดประเสริฐ', studentId: '1378', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 74, name: 'นายอธิชาติ นวลใส', studentId: '1472', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 75, name: 'นางสาวจิรัญญา พึ่งแพง', studentId: '1473', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 76, name: 'เด็กหญิงปาลิตา บุญพบ', studentId: '1383', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 77, name: 'นางสาวมยุริญ ทองสาย', studentId: '1386', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 78, name: 'นางสาววรรณษา อินทร์ตา', studentId: '1474', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 79, name: 'นางสาวสรัญญา พรหมมา', studentId: '1389', class: 'ม.6', status: 'none', time: null, scores: {} },
  { id: 80, name: 'นางสาวอรอมล มีชัย', studentId: '1475', class: 'ม.6', status: 'none', time: null, scores: {} },
];

const classesList = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];
const initialClassesList = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

const colorMap: Record<string, { bg: string, text: string }> = {
  purple: { bg: 'bg-[#9C27B0]', text: 'text-white' },
  blue: { bg: 'bg-[#2196F3]', text: 'text-white' },
  orange: { bg: 'bg-[#FF9800]', text: 'text-black' },
  green: { bg: 'bg-[#4CAF50]', text: 'text-white' },
  yellow: { bg: 'bg-[#FFEB3B]', text: 'text-black' },
  pink: { bg: 'bg-[#E91E63]', text: 'text-white' },
  teal: { bg: 'bg-[#009688]', text: 'text-white' },
  red: { bg: 'bg-[#D32F2F]', text: 'text-white' },
};

function calculateGrade(total: number): string {
  if (total >= 80) return '4';
  if (total >= 75) return '3.5';
  if (total >= 70) return '3';
  if (total >= 65) return '2.5';
  if (total >= 60) return '2';
  if (total >= 55) return '1.5';
  if (total >= 50) return '1';
  return '0';
}

function formatThaiDate(dateStr: string) {
  const date = new Date(dateStr);
  const months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
}

export default function App() {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [enrollments, setEnrollments] = useState<Record<number, string[]>>(initialEnrollments);
  const [schedule, setSchedule] = useState<Record<string, (number | null)[]>>(initialSchedule);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, Record<string, string>>>({}); // `${courseId}-${date}` -> { studentId: status }
  const [currentCourseId, setCurrentCourseId] = useState<number | null>(null);
  const [classesList, setClassesList] = useState<string[]>(initialClassesList);
  const [schoolName, setSchoolName] = useState('โรงเรียนน้ำคำวิทยา');
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [newSettingsClass, setNewSettingsClass] = useState('');
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedStudentProfileId, setSelectedStudentProfileId] = useState<number | null>(null);
  const [currentClass, setCurrentClass] = useState('ม.1');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  
  const [loading, setLoading] = useState(true);

  // Sync with Firebase
  useEffect(() => {
    let isSubscribed = true;
    const unsub = onSnapshot(doc(db, 'config', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.courses) setCourses(data.courses);
        if (data.enrollments) setEnrollments(data.enrollments);
        if (data.schedule) setSchedule(data.schedule);
        if (data.attendanceRecords) setAttendanceRecords(data.attendanceRecords);
        if (data.classesList) setClassesList(data.classesList);
        if (data.schoolName) setSchoolName(data.schoolName);
        if (data.students) setStudents(data.students);
      } else {
        // Init with defaults if not exists
        setDoc(doc(db, 'config', 'global'), {
          schoolName: 'โรงเรียนน้ำคำวิทยา',
          courses: initialCourses,
          enrollments: initialEnrollments,
          schedule: initialSchedule,
          students: initialStudents,
          classesList: initialClassesList,
          attendanceRecords: {}
        }).catch(err => console.error("Firebase init err:", err));
      }
      setTimeout(() => {
        if (isSubscribed) setLoading(false);
      }, 0);
    }, (err) => {
      console.error("Firebase sync error:", err);
      setLoading(false);
    });
    return () => {
      isSubscribed = false;
      unsub();
    };
  }, []);

  const handleSaveData = async () => {
    try {
      await setDoc(doc(db, 'config', 'global'), {
        schoolName,
        courses,
        enrollments,
        schedule,
        students,
        classesList,
        attendanceRecords
      });
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้า Firebase');
    }
  };
  
  const [showModal, setShowModal] = useState<'add-student' | 'edit-student' | 'add-course' | 'edit-course' | 'edit-course-scores' | 'add-assignment' | 'edit-assignment' | 'view-submissions' | 'submit-work' | 'confirm' | null>(null);
  const [confirmOpts, setConfirmOpts] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<number | null>(null);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);

  const handleUpdateStatus = (id: number, status: Status) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return {
          ...s,
          status,
          time: (status === 'present' || status === 'late') ? new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : null
        };
      }
      return s;
    }));
  };

  const handleUpdateScore = (id: number, field: keyof Scores, value: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, scores: { ...s.scores, [field]: value } };
      }
      return s;
    }));
  };

  const handleUpdateTaskScore = (id: number, field: string, value: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, scores: { ...s.scores, [field]: value } };
      }
      return s;
    }));
  };

  function renderHeader() {
    return (
      <header className="card-mc mb-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-6">
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center justify-center flex-shrink-0">
                  <div className="w-16 h-16 bg-white minecraft-border flex items-center justify-center p-1">
                    <img src="https://i.postimg.cc/3xq869Sd/logo-learn-na-craft2.jpg" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-[#F5DEB3] text-sm mt-2 text-center whitespace-nowrap">{schoolName}</p>
                </div>
                <div className="flex items-center h-16">
                  <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">ระบบบันทึกการมาเรียนและผลการเรียน</h1>
                </div>
              </div>
              
                <div className="flex flex-row items-stretch justify-end h-auto gap-2">
                  <div className="text-white font-bold bg-[#5D3A1A] px-3 py-2 minecraft-border text-sm flex flex-col justify-center items-end min-h-[3rem]">
                    <span>ผู้ใช้งาน: {currentUser?.name}</span>
                    <span className="text-xs text-[#F5DEB3]">({currentUser?.role === 'teacher' ? 'คุณครู/ผู้ดูแล' : 'นักเรียน'})</span>
                  </div>
                  <button 
                    onClick={() => {
                        setCurrentUser(null);
                    }} 
                    className="btn-mc bg-red-600 text-white px-4 text-sm font-bold m-0 flex items-center justify-center min-h-[3rem]"
                  >
                    ออกจากระบบ
                  </button>
                </div>
            </div>

            <nav className="flex flex-wrap items-center justify-center w-full gap-2 border-t border-black/20 pt-4">
              <button onClick={() => setCurrentView('dashboard')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'dashboard' ? 'btn-mc-green' : ''}`}>แดชบอร์ด</button>
              <button onClick={() => setCurrentView('schedule')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'schedule' ? 'btn-mc-green' : ''}`}>ตารางสอน</button>
              
              {currentUser?.role === 'teacher' && (
                <>
                  <button onClick={() => setCurrentView('attendance')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'attendance' ? 'btn-mc-green' : ''}`}>เช็คชื่อ</button>
                  <button onClick={() => setCurrentView('tasks')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'tasks' ? 'btn-mc-green' : ''}`}>มอบหมาย/ตรวจงาน</button>
                  <button onClick={() => setCurrentView('grading')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'grading' ? 'btn-mc-green' : ''}`}>ผลการเรียน</button>
                  <button onClick={() => setCurrentView('reports')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'reports' ? 'btn-mc-green' : ''}`}>รายงาน</button>
                  <button onClick={() => setCurrentView('activities')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'activities' ? 'btn-mc-green' : ''}`}>สื่อการเรียนรู้</button>
                  <button onClick={() => setCurrentView('enrollment')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'enrollment' ? 'btn-mc-green' : ''}`}>ลงทะเบียนเรียน</button>
                  <button onClick={() => setCurrentView('courses')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'courses' ? 'btn-mc-green' : ''}`}>จัดการรายวิชา</button>
                  <button onClick={() => setCurrentView('students')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'students' ? 'btn-mc-green' : ''}`}>จัดการนักเรียน</button>
                  <button onClick={() => setCurrentView('settings')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'settings' ? 'btn-mc-green' : ''}`}>ตั้งค่า</button>
                </>
              )}
              {currentUser?.role === 'student' && (
                <>
                  <button onClick={() => setCurrentView('tasks')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'tasks' ? 'btn-mc-green' : ''}`}>รับงาน/ส่งงาน</button>
                  <button onClick={() => setCurrentView('grading')} className={`btn-mc whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'grading' ? 'btn-mc-green' : ''}`}>ดูคะแนน</button>
                </>
              )}
              
              {['attendance', 'tasks', 'grading', 'reports', 'activities', 'enrollment'].includes(currentView) && currentUser?.role === 'teacher' && (
                <div className="flex items-center gap-2 mt-2 md:mt-0 w-full sm:w-auto justify-center md:justify-start">
                  <span className="text-[#F5DEB3] font-bold whitespace-nowrap text-sm drop-shadow-md">เลือกรายวิชา:</span>
                  <select 
                    value={currentCourseId || ''} 
                    onChange={(e) => setCurrentCourseId(e.target.value ? parseInt(e.target.value) : null)} 
                    className="input-mc-dark font-semibold py-2 px-3 max-w-[200px]"
                  >
                    <option value="" disabled>-- เลือกรายวิชา --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
                  </select>
                </div>
              )}
            </nav>

          </div>
        </div>
      </header>
    );
  }

  function renderDashboard() {
    if (currentUser?.role === 'student') {
      const studentCourses = courses.filter(c => (enrollments[c.id] || []).includes(currentUser.username));
      const me = students.find(s => s.studentId === currentUser.username);
      
      return (
        <div className="animate-slide-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="card-mc p-6 flex flex-col items-center justify-center text-center minecraft-border">
              <div className="w-20 h-20 bg-blue-500 mb-4 flex items-center justify-center rounded-full border-4 border-[#F5DEB3]">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <h2 className="text-xl font-bold text-[#F5DEB3]">ยินดีต้อนรับ</h2>
              <p className="text-2xl font-bold text-white mt-1">{currentUser.name}</p>
              <p className="text-[#E8D5B7]">{me?.class}</p>
            </div>
            
            <div className="card-mc p-6 flex flex-col justify-center minecraft-border bg-gradient-to-br from-[#2E7D32] to-[#1B5E20]">
              <h2 className="text-[#F5DEB3] text-lg font-bold mb-2">จำนวนวิชาที่ลงทะเบียน</h2>
              <div className="text-white text-5xl font-bold">{studentCourses.length} <span className="text-xl">วิชา</span></div>
            </div>
          </div>
          
          <div className="card-mc-light p-6 minecraft-border">
            <h2 className="text-2xl font-bold text-black mb-4">ประกาศ / ข่าวสาร</h2>
            <div className="bg-[#E8D5B7] p-4 minecraft-border min-h-[100px] flex items-center justify-center">
              <p className="text-black/60 font-bold">ยังไม่มีประกาศใหม่ในขณะนี้</p>
            </div>
          </div>
        </div>
      );
    }
    
    const dateObj = new Date(currentDate);
    const dayIndex = dateObj.getDay();
    const daysArr = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const currentDayStr = daysArr[dayIndex];
    
    // Get courses for today
    const todaySchedule = schedule[currentDayStr] || [];
    const todayCoursesCount = todaySchedule.filter(Boolean).length;

    let totalStudents = 0;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    let displayTitle = 'ทั้งหมด (วันนี้)';

    if (currentCourseId) {
      const selectedCourse = courses.find(c => c.id === currentCourseId);
      if (selectedCourse) {
        displayTitle = `${selectedCourse.code} (${selectedCourse.name})`;
        const classStudents = students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId));
        totalStudents = classStudents.length;
        const recordKey = `${selectedCourse.id}-${currentDate}`;
        const records = attendanceRecords[recordKey] || {};
        
        classStudents.forEach(s => {
          const status = records[s.studentId];
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
          else if (status === 'late') lateCount++;
          else if (status === 'leave') leaveCount++;
        });
      }
    } else {
      // Calculate over all today's courses
      const validTodayCourses = todaySchedule
        .map(courseId => courses.find(c => c.id === courseId))
        .filter((c): c is Course => c !== undefined);

      validTodayCourses.forEach(course => {
        const classStudents = students.filter(s => (enrollments[course.id] || []).includes(s.studentId));
        totalStudents += classStudents.length;
        const recordKey = `${course.id}-${currentDate}`;
        const records = attendanceRecords[recordKey] || {};

        classStudents.forEach(s => {
          const status = records[s.studentId];
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
          else if (status === 'late') lateCount++;
          else if (status === 'leave') leaveCount++;
        });
      });
    }

    const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return (
      <div className="animate-slide-in">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="card-mc p-4 flex items-center justify-between">
            <div>
              <div className="text-[#F5DEB3] text-sm font-bold">จำนวนรายวิชาทั้งหมด</div>
              <div className="text-white text-3xl font-bold">{courses.length} <span className="text-sm">วิชา</span></div>
            </div>
            <div className="w-12 h-12 bg-blue-500 minecraft-border flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9z"/></svg>
            </div>
          </div>
          <div className="card-mc p-4 flex items-center justify-between">
            <div>
              <div className="text-[#F5DEB3] text-sm font-bold">คาบสอนวันนี้ ({currentDayStr})</div>
              <div className="text-white text-3xl font-bold">{todayCoursesCount} <span className="text-sm">คาบ</span></div>
            </div>
            <div className="w-12 h-12 bg-purple-500 minecraft-border flex items-center justify-center text-white">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
            </div>
          </div>
        </div>

        <div className="card-mc-light p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 text-black">สถิติการเข้าเรียน: {displayTitle}</h2>
              <p className="text-black">วันที่ {formatThaiDate(currentDate)}</p>
            </div>
            <div className="flex gap-2 text-black">
              <select value={currentCourseId || ''} onChange={(e) => setCurrentCourseId(e.target.value ? parseInt(e.target.value) : null)} className="input-mc-dark font-bold">
                <option value="">ทั้งหมดของวันนี้</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} ({c.name})</option>)}
              </select>
              <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="input-mc-light text-black font-bold" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-block p-4 pixel-shadow">
              <div className="text-white text-sm mb-1 font-semibold">มาเรียน</div>
              <div className="text-white text-4xl font-bold">{presentCount} <span className="text-sm">/{totalStudents}</span></div>
              <div className="text-white text-xs mt-1 font-semibold">{attendanceRate}%</div>
            </div>
            <div className="stat-block stat-block-red p-4 pixel-shadow">
              <div className="text-white text-sm mb-1 font-semibold">ขาดเรียน</div>
              <div className="text-white text-4xl font-bold">{absentCount}</div>
            </div>
            <div className="stat-block stat-block-yellow p-4 pixel-shadow">
              <div className="text-black text-sm mb-1 font-semibold">มาสาย</div>
              <div className="text-black text-4xl font-bold">{lateCount}</div>
            </div>
            <div className="stat-block stat-block-blue p-4 pixel-shadow">
              <div className="text-white text-sm mb-1 font-semibold">ลา</div>
              <div className="text-white text-4xl font-bold">{leaveCount}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAttendance() {
    const dateObj = new Date(currentDate);
    const dayIndex = dateObj.getDay();
    const daysArr = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    const currentDayStr = daysArr[dayIndex];
    
    // Get courses for today
    const todaySchedule = schedule[currentDayStr] || [];
    const todayCourses = todaySchedule
      .map(courseId => courses.find(c => c.id === courseId))
      .filter((c): c is Course => c !== undefined);

    const selectedCourse = courses.find(c => c.id === currentCourseId);
    
    // Fallback if course not selected or not in today's schedule
    const studentsToRender = selectedCourse 
      ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId)) 
      : [];

    const handleUpdateCourseAttendance = (studentId: string, status: string) => {
      if (!selectedCourse) return;
      const recordKey = `${selectedCourse.id}-${currentDate}`;
      setAttendanceRecords(prev => ({
        ...prev,
        [recordKey]: {
          ...prev[recordKey],
          [studentId]: status
        }
      }));
    };

    const getStudentStatus = (studentId: string) => {
      if (!selectedCourse) return null;
      const recordKey = `${selectedCourse.id}-${currentDate}`;
      return attendanceRecords[recordKey]?.[studentId] || null;
    };

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">เช็คชื่อรายวิชา {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            <div className="flex gap-2 text-black">
              <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="input-mc-light text-black font-bold" />
              {selectedCourse && (
                <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
              )}
            </div>
          </div>
          
          {!selectedCourse && (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อเช็คชื่อนักเรียน</h3>
             </div>
          )}

          {selectedCourse && (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 bg-[#E8D5B7] p-4 border-2 border-black">
                <h3 className="text-xl font-bold text-black">
                  รายชื่อนักเรียน ({selectedCourse.name})
                </h3>
              </div>
              <div className="space-y-2">
                {studentsToRender.map(student => {
                  const status = getStudentStatus(student.studentId);
                  return (
                    <div key={student.id} className="student-row minecraft-border bg-[#F5DEB3] p-3 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 bg-[#4CAF50] minecraft-border flex items-center justify-center text-white font-bold flex-shrink-0">
                          {student.studentId.slice(-2)}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-black">{student.name}</div>
                          <div className="text-sm text-black">รหัส: {student.studentId}</div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        <button onClick={() => handleUpdateCourseAttendance(student.studentId, 'present')} className={`btn-mc px-3 py-1 text-xs ${status === 'present' ? 'btn-mc-green' : ''}`}>มา</button>
                        <button onClick={() => handleUpdateCourseAttendance(student.studentId, 'absent')} className={`btn-mc px-3 py-1 text-xs ${status === 'absent' ? 'btn-mc-red' : ''}`}>ขาด</button>
                        <button onClick={() => handleUpdateCourseAttendance(student.studentId, 'late')} className={`btn-mc px-3 py-1 text-xs ${status === 'late' ? 'btn-mc-yellow' : ''}`}>สาย</button>
                        <button onClick={() => handleUpdateCourseAttendance(student.studentId, 'leave')} className={`btn-mc px-3 py-1 text-xs ${status === 'leave' ? 'btn-mc-blue' : ''}`}>ลา</button>
                      </div>
                    </div>
                  );
                })}
                {studentsToRender.length === 0 && (
                  <div className="text-black font-semibold text-center p-4">ไม่พบนักเรียนในห้องนี้</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderSchedule() {
    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">ตารางสอน</h2>
            <div className="text-sm text-black bg-[#F5DEB3] px-3 py-1 border-2 border-black font-bold">หากต้องการแก้ไขตารางสอน ให้ไปที่เมนู 'ตั้งค่า'</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#E8D5B7] minecraft-border">
                  <th className="p-3 text-center text-black font-bold whitespace-nowrap">วัน/คาบ</th>
                  {[1,2,3,4,5,6,7,8].map(p => (
                    <th key={p} className="p-3 text-center text-black font-bold">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day} className="minecraft-border bg-[#F5DEB3]">
                    <td className="p-3 bg-[#E8D5B7] border-r-4 border-black text-center text-black font-bold">{day}</td>
                    {schedule[day].map((courseId, idx) => {
                      const course = courses.find(c => c.id === courseId);
                      return (
                        <td key={idx} className="p-2 border-l-2 border-black/20 min-w-[120px]">
                          {course ? (
                            <div className="group relative">
                              <div className={`border-2 border-black p-2 ${colorMap[course.color]?.bg || 'bg-gray-300'} ${colorMap[course.color]?.text || 'text-black'} flex flex-col items-center justify-center min-h-[5rem]`}>
                                <div className="font-bold text-sm text-center leading-tight mb-1">{course.name}</div>
                                <div className="text-xs text-center opacity-80 mb-1">({course.code})</div>
                                {course.teacher && <div className="text-xs font-semibold text-center mt-1 truncate w-full" title={course.teacher}>{course.teacher}</div>}
                                {course.room && <div className="text-[10px] text-center mt-0.5 opacity-90">{course.room}</div>}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full text-xs font-bold p-1 h-14 border-2 border-dashed border-black/30 flex items-center justify-center text-black/50">
                              - ว่าง -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderTasks() {
    if (currentUser?.role === 'student') {
      const studentCourses = courses.filter(c => (enrollments[c.id] || []).includes(currentUser.username));
      
      return (
        <div className="animate-slide-in">
          <div className="card-mc-light p-6 mb-4">
            <h2 className="text-2xl font-bold text-black mb-6">งานที่ได้รับมอบหมาย</h2>
            {studentCourses.length === 0 ? (
              <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
                <h3 className="text-xl font-bold text-black/60">คุณยังไม่ได้ลงทะเบียนเรียนในรายวิชาใดๆ</h3>
              </div>
            ) : (
              <div className="space-y-8">
                {studentCourses.map(course => (
                  <div key={course.id}>
                    <h3 className="text-xl font-bold mb-4 text-black border-b-2 border-black/20 pb-2">{course.code} {course.name}</h3>
                    {(course.assignments || []).length === 0 ? (
                      <div className="text-black font-semibold text-center p-4 bg-[#F5DEB3] minecraft-border">ยังไม่มีงานในวิชานี้</div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {course.assignments.map(a => {
                          const taskKey = `course_${course.id}_task_${a.id}`;
                          const me = students.find(s => s.studentId === currentUser.username);
                          const myScore = me?.scores[taskKey];
                          
                          return (
                            <div key={a.id} className="minecraft-border bg-[#F5DEB3] p-4 flex flex-col space-y-2">
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg text-black">{a.name}</h4>
                                <span className="font-bold text-blue-800 bg-[#E8D5B7] px-2 py-1 minecraft-border text-sm">{a.maxScore} คะแนน</span>
                              </div>
                              {a.dueDate && <p className="text-sm font-semibold text-red-700">กำหนดส่ง: {formatThaiDate(a.dueDate)}</p>}
                              {a.description && <p className="text-sm text-black line-clamp-2">{a.description}</p>}
                              {a.submissionMethod && <p className="text-sm font-semibold text-black mt-2">วิธีส่ง: {a.submissionMethod}</p>}
                              {a.learningMaterialUrl && (
                                <a href={a.learningMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-sm underline mt-1">สื่อการเรียน/เอกสาร</a>
                              )}
                              <div className="mt-2 pt-2 border-t border-black/10">
                                {myScore !== undefined ? (
                                  <div className="text-green-700 font-bold bg-green-100 p-2 text-center minecraft-border">
                                    ได้รับคะแนนแล้ว: {myScore}/{a.maxScore}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <div className="text-red-700 font-bold text-center">ยังไม่ได้ส่งงาน</div>
                                    <button onClick={() => alert('จำลองการส่งงาน (อัพโหลดไฟล์)')} className="btn-mc bg-[#5D3A1A] text-[#F5DEB3] px-2 py-2 text-sm font-bold w-full">ส่งงาน</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    const selectedCourse = courses.find(c => c.id === currentCourseId);
    const studentsToRender = selectedCourse ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId)) : [];
    
    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">บันทึกคะแนนเก็บ / มอบหมายงาน {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            {selectedCourse && (
              <div className="flex gap-2">
                <button onClick={() => setShowModal('add-assignment')} className="btn-mc bg-[#5D3A1A] px-4 py-2 font-bold whitespace-nowrap text-[#F5DEB3]">เพิ่มงานใหม่</button>
                <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
              </div>
            )}
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อบันทึกคะแนนและมอบหมายงาน</h3>
             </div>
          ) : (
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b-2 border-black/20 pb-2">รายการงานที่มอบหมาย</h3>
                {(selectedCourse.assignments || []).length === 0 ? (
                  <div className="text-black font-semibold text-center p-4 bg-[#F5DEB3] minecraft-border">ยังไม่มีการมอบหมายงาน</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedCourse.assignments.map(a => (
                      <div key={a.id} className="minecraft-border bg-[#F5DEB3] p-4 flex flex-col space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-lg text-black">{a.name}</h4>
                          <span className="font-bold text-blue-800 bg-[#E8D5B7] px-2 py-1 minecraft-border text-sm">{a.maxScore} คะแนน</span>
                        </div>
                        {a.dueDate && <p className="text-sm font-semibold text-red-700">กำหนดส่ง: {formatThaiDate(a.dueDate)}</p>}
                        {a.description && <p className="text-sm text-black line-clamp-2">{a.description}</p>}
                        {a.submissionMethod && <p className="text-sm font-semibold text-black mt-2">วิธีส่ง: {a.submissionMethod}</p>}
                        {a.learningMaterialUrl && (
                          <a href={a.learningMaterialUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-sm underline mt-1">สื่อการเรียน/เอกสาร</a>
                        )}
                        <div className="flex gap-2 pt-2 mt-auto border-t border-black/10">
                          <button onClick={() => { setEditingAssignment(a); setShowModal('edit-assignment'); }} className="btn-mc bg-[#E8D5B7] text-black px-2 py-1 text-sm font-bold flex-1">แก้ไข</button>
                          <button onClick={() => { setCurrentAssignmentId(a.id); setShowModal('view-submissions'); }} className="btn-mc bg-[#5D3A1A] text-[#F5DEB3] px-2 py-1 text-sm font-bold flex-1">ตรวจงาน</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold mb-4 text-black border-b-2 border-black/20 pb-2">ตารางคะแนนเก็บ</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#E8D5B7] minecraft-border">
                        <th className="p-3 text-left text-black font-bold whitespace-nowrap">รหัส</th>
                        <th className="p-3 text-left text-black font-bold whitespace-nowrap">ชื่อ-นามสกุล</th>
                        {(selectedCourse.assignments || []).map(a => (
                          <th key={a.id} className="p-3 text-center text-black font-bold whitespace-nowrap">{a.name}</th>
                        ))}
                        <th className="p-3 text-center text-black font-bold whitespace-nowrap text-blue-800">
                          รวม ({selectedCourse.assignments?.reduce((sum, a) => sum + a.maxScore, 0) || 0})
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsToRender.map(s => {
                        const taskSum = (selectedCourse.assignments || []).reduce((sum, a) => {
                          const key = `course_${selectedCourse.id}_task_${a.id}`;
                          return sum + (s.scores[key] || 0);
                        }, 0);
                        
                        return (
                          <tr key={s.id} className="minecraft-border bg-[#F5DEB3]">
                            <td className="p-3 text-black font-semibold whitespace-nowrap">{s.studentId}</td>
                            <td className="p-3 text-black font-semibold min-w-[200px]">{s.name}</td>
                            {(selectedCourse.assignments || []).map(a => {
                              const key = `course_${selectedCourse.id}_task_${a.id}`;
                              return (
                                <td key={a.id} className="p-3 text-center">
                                  <input type="number" min="0" max={a.maxScore} 
                                    value={s.scores[key] !== undefined ? s.scores[key] : ''} 
                                    onChange={(e) => handleUpdateTaskScore(s.id, key, parseInt(e.target.value) || 0)}
                                    className="input-mc-light w-16 text-center py-1 px-2 text-sm mx-auto flex" />
                                </td>
                              );
                            })}
                            <td className="p-3 text-center text-black font-bold text-lg text-blue-800">{taskSum}</td>
                          </tr>
                        );
                      })}
                      {studentsToRender.length === 0 && (
                        <tr>
                          <td colSpan={3 + (selectedCourse.assignments?.length || 0)} className="p-6 text-center font-bold">ไม่พบนักเรียนที่ลงทะเบียนเรียนในรายวิชานี้</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderGrading() {
    if (currentUser?.role === 'student') {
      const studentCourses = courses.filter(c => (enrollments[c.id] || []).includes(currentUser.username));
      const me = students.find(s => s.studentId === currentUser.username);
      
      return (
        <div className="animate-slide-in">
          <div className="card-mc-light p-6 mb-4">
            <h2 className="text-2xl font-bold text-black mb-6">ผลการเรียนของฉัน</h2>
            {studentCourses.length === 0 ? (
              <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
                <h3 className="text-xl font-bold text-black/60">คุณยังไม่ได้ลงทะเบียนเรียนในรายวิชาใดๆ</h3>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#E8D5B7] minecraft-border">
                      <th className="p-3 text-left text-black font-bold whitespace-nowrap">รายวิชา</th>
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">เก็บคะแนนรวม</th>
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">กลางภาค</th>
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">ปลายภาค</th>
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">รวม (100)</th>
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">เกรด</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentCourses.map(c => {
                      const maxTaskScore = c.assignments?.reduce((s, a) => s + a.maxScore, 0) || 0;
                      const taskSum = (c.assignments || []).reduce((sum, a) => {
                        const key = `course_${c.id}_task_${a.id}`;
                        return sum + (me?.scores[key] || 0);
                      }, 0);
                      
                      const midKey = `course_${c.id}_midterm`;
                      const finKey = `course_${c.id}_final`;
                      const midScore = me?.scores[midKey] || 0;
                      const finScore = me?.scores[finKey] || 0;
                      const totalScore = taskSum + midScore + finScore;
                      const grade = calculateGrade(totalScore);
                      
                      return (
                        <tr key={c.id} className="minecraft-border bg-[#F5DEB3]">
                          <td className="p-3 text-black font-semibold whitespace-nowrap">{c.code} {c.name}</td>
                          <td className="p-3 text-center font-bold">{taskSum} / {maxTaskScore}</td>
                          <td className="p-3 text-center font-bold">{midScore} / {c.midtermMaxScore}</td>
                          <td className="p-3 text-center font-bold">{finScore} / {c.finalMaxScore}</td>
                          <td className="p-3 text-center font-bold text-blue-800">{totalScore}</td>
                          <td className={`p-3 text-center font-bold text-lg ${grade === '0' ? 'text-red-600' : 'text-green-700'}`}>{grade}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    const selectedCourse = courses.find(c => c.id === currentCourseId);
    const studentsToRender = selectedCourse ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId)) : [];

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black mb-4">บันทึกผลการเรียน {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            {selectedCourse && (
              <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
            )}
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อบันทึกผลการเรียน</h3>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#E8D5B7] minecraft-border">
                    <th className="p-3 text-left text-black font-bold whitespace-nowrap">รหัส</th>
                    <th className="p-3 text-left text-black font-bold whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="p-3 text-center text-black font-bold whitespace-nowrap">เก็บคะแนนรวม ({selectedCourse.assignments?.reduce((s, a) => s + a.maxScore, 0) || 0})</th>
                    <th className="p-3 text-center text-black font-bold whitespace-nowrap">กลางภาค ({selectedCourse.midtermMaxScore || 0})</th>
                    <th className="p-3 text-center text-black font-bold whitespace-nowrap">ปลายภาค ({selectedCourse.finalMaxScore || 0})</th>
                    <th className="p-3 text-center text-black font-bold whitespace-nowrap">รวม (100)</th>
                    <th className="p-3 text-center text-black font-bold whitespace-nowrap">เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsToRender.map(s => {
                    const taskSum = (selectedCourse.assignments || []).reduce((sum, a) => {
                      const key = `course_${selectedCourse.id}_task_${a.id}`;
                      return sum + (s.scores[key] || 0);
                    }, 0);
                    
                    const midKey = `course_${selectedCourse.id}_midterm`;
                    const finKey = `course_${selectedCourse.id}_final`;
                    const midScore = s.scores[midKey] || 0;
                    const finScore = s.scores[finKey] || 0;
                    const totalScore = taskSum + midScore + finScore;
                    
                    const grade = calculateGrade(totalScore);
                    const isRed = grade === '0';
                    const isGreen = grade.startsWith('4');
                    return (
                      <tr key={s.id} className="minecraft-border bg-[#F5DEB3]">
                        <td className="p-3 text-black font-semibold whitespace-nowrap">{s.studentId}</td>
                        <td className="p-3 text-black font-semibold min-w-[200px]">{s.name}</td>
                        <td className="p-3 text-center font-bold text-lg text-blue-800">{taskSum}</td>
                        <td className="p-3 text-center">
                          <input type="number" min="0" max={selectedCourse.midtermMaxScore || 0} 
                            value={s.scores[midKey] !== undefined ? s.scores[midKey] : ''} 
                            onChange={(e) => handleUpdateTaskScore(s.id, midKey, parseInt(e.target.value) || 0)}
                            className="input-mc-light w-20 text-center py-1 px-2 text-sm mx-auto flex" />
                        </td>
                        <td className="p-3 text-center">
                          <input type="number" min="0" max={selectedCourse.finalMaxScore || 0} 
                            value={s.scores[finKey] !== undefined ? s.scores[finKey] : ''} 
                            onChange={(e) => handleUpdateTaskScore(s.id, finKey, parseInt(e.target.value) || 0)}
                            className="input-mc-light w-20 text-center py-1 px-2 text-sm mx-auto flex" />
                        </td>
                        <td className="p-3 text-center text-black font-bold text-lg">{totalScore}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex w-10 h-10 items-center justify-center rounded-full minecraft-border font-bold text-white shadow ${isRed ? 'bg-[#D32F2F]' : isGreen ? 'bg-[#4CAF50]' : 'bg-[#2196F3]'}`}>
                            {grade}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {studentsToRender.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center font-bold">ไม่พบนักเรียนที่ลงทะเบียนเรียนในรายวิชานี้</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderEnrollment() {
    const selectedCourse = courses.find(c => c.id === currentCourseId);
    
    const toggleEnrollment = (studentId: string) => {
      if (!selectedCourse) return;
      setEnrollments(prev => {
        const currentCourseEnrollments = prev[selectedCourse.id] || [];
        if (currentCourseEnrollments.includes(studentId)) {
          return { ...prev, [selectedCourse.id]: currentCourseEnrollments.filter(id => id !== studentId) };
        } else {
          return { ...prev, [selectedCourse.id]: [...currentCourseEnrollments, studentId] };
        }
      });
    };

    const handleSave = () => {
      alert('บันทึกข้อมูลการลงทะเบียนเรียบร้อยแล้ว');
    };

    const searchLower = enrollmentSearch.toLowerCase();
    const filteredStudents = students.filter(s => 
      s.name.toLowerCase().includes(searchLower) ||
      s.class.toLowerCase().includes(searchLower) ||
      s.studentId.toLowerCase().includes(searchLower)
    );

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">ลงทะเบียนเรียน {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            {selectedCourse && (
               <button onClick={handleSave} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
            )}
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อจัดการลงทะเบียนเรียน</h3>
             </div>
          ) : (
            <>
              <div className="mb-4">
                <input 
                  type="text" 
                  value={enrollmentSearch}
                  onChange={(e) => setEnrollmentSearch(e.target.value)}
                  placeholder="ค้นหาชื่อ, รหัสนักเรียน, ชั้นเรียน..." 
                  className="input-mc-light w-full p-3 font-bold text-black"
                />
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {filteredStudents.map(student => {
                  const isEnrolled = (enrollments[selectedCourse.id] || []).includes(student.studentId);
                  return (
                    <label key={student.id} className={`minecraft-border p-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${isEnrolled ? 'bg-[#90EE90] border-black/50' : 'bg-[#F5DEB3]'}`}>
                      <div className="flex flex-1 items-center gap-3">
                         <input 
                           type="checkbox" 
                           checked={isEnrolled}
                           onChange={() => toggleEnrollment(student.studentId)}
                           className="w-6 h-6 border-2 border-black"
                         />
                         <div>
                           <div className="font-bold text-lg text-black">{student.name}</div>
                           <div className="text-sm text-black">รหัส: {student.studentId} | ห้อง: {student.class}</div>
                         </div>
                      </div>
                      {isEnrolled ? (
                        <span className="font-bold text-green-800">ลงทะเบียนแล้ว</span>
                      ) : (
                        <span className="font-bold text-red-800">ยังไม่ลงทะเบียน</span>
                      )}
                    </label>
                  );
                })}
                {filteredStudents.length === 0 && (
                  <div className="p-8 text-center bg-[#E8D5B7] border-2 border-black">
                    <p className="font-bold text-black">ไม่พบข้อมูลนักเรียนที่ค้นหา</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderActivities() {
    const selectedCourse = courses.find(c => c.id === currentCourseId);

    const updateCourse = (updatedCourse: Course) => {
      setCourses(courses.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    };

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black mb-4">จัดการเรียนรู้และสร้างกิจกรรม {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            {selectedCourse && (
              <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
            )}
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อตั้งค่าการเรียนรู้และกิจกรรม</h3>
             </div>
          ) : (
            <div className="space-y-4">
              <div className="minecraft-border bg-[#F5DEB3] p-4 text-black">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg">คะแนนเก็บ (Assignments)</h4>
                  <button type="button" onClick={() => updateCourse({...selectedCourse, assignments: [...(selectedCourse.assignments||[]), {id: Date.now(), name: 'งานใหม่', maxScore: 10}]})} className="btn-mc btn-mc-green px-4 py-2 text-sm">+ เพิ่มงาน</button>
                </div>
                {(!selectedCourse.assignments || selectedCourse.assignments.length === 0) && (
                  <p className="text-sm">ยังไม่มีงาน</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedCourse.assignments?.map((a, idx) => (
                    <div key={a.id} className="bg-[#E8D5B7] minecraft-border p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm">งานที่ {idx + 1}</span>
                        <button type="button" onClick={() => updateCourse({...selectedCourse, assignments: selectedCourse.assignments.filter((_, i) => i !== idx)})} className="btn-mc btn-mc-red px-2 py-1 text-xs">ลบ</button>
                      </div>
                      <input type="text" value={a.name} onChange={(e) => {
                        const newAssignments = [...selectedCourse.assignments];
                        newAssignments[idx].name = e.target.value;
                        updateCourse({...selectedCourse, assignments: newAssignments});
                      }} className="input-mc-light w-full text-sm py-1 px-2 text-black" placeholder="ชื่องาน" />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-semibold">คะแนนเต็ม:</span>
                        <input type="number" min="0" value={a.maxScore} onChange={(e) => {
                          const newAssignments = [...selectedCourse.assignments];
                          newAssignments[idx].maxScore = parseInt(e.target.value) || 0;
                          updateCourse({...selectedCourse, assignments: newAssignments});
                        }} className="input-mc-light w-20 text-center text-sm py-1 px-2 text-black" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="minecraft-border bg-[#F5DEB3] p-4 text-black">
                <h4 className="font-bold text-lg mb-4">คะแนนสอบ (Exams)</h4>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex items-center gap-4 bg-[#E8D5B7] minecraft-border p-3 flex-1">
                    <span className="flex-1 font-semibold">สอบกลางภาค</span>
                    <input type="number" min="0" value={selectedCourse.midtermMaxScore || 0} onChange={(e) => {
                      updateCourse({...selectedCourse, midtermMaxScore: parseInt(e.target.value) || 0});
                    }} className="input-mc-light w-24 text-center py-2 px-2 text-black font-bold" />
                  </div>
                  <div className="flex items-center gap-4 bg-[#E8D5B7] minecraft-border p-3 flex-1">
                    <span className="flex-1 font-semibold">สอบปลายภาค</span>
                    <input type="number" min="0" value={selectedCourse.finalMaxScore || 0} onChange={(e) => {
                      updateCourse({...selectedCourse, finalMaxScore: parseInt(e.target.value) || 0});
                    }} className="input-mc-light w-24 text-center py-2 px-2 text-black font-bold" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderCourses() {
    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-black">จัดการรายวิชา</h2>
            <button onClick={() => { setEditingCourse(null); setShowModal('add-course'); }} className="btn-mc btn-mc-green px-6 py-3 font-bold">
              + เพิ่มรายวิชา
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#E8D5B7] minecraft-border">
                  <th className="p-3 text-left text-black font-bold">รหัสวิชา</th>
                  <th className="p-3 text-left text-black font-bold">ชื่อวิชา</th>
                  <th className="p-3 text-center text-black font-bold">หน่วยกิต</th>
                  <th className="p-3 text-center text-black font-bold">คาบ/สัปดาห์</th>
                  <th className="p-3 text-left text-black font-bold">ผู้สอน</th>
                  <th className="p-3 text-left text-black font-bold">สถานที่</th>
                  <th className="p-3 text-center text-black font-bold">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} className="minecraft-border bg-[#F5DEB3]">
                    <td className="p-3 text-black font-semibold">
                      <div className={`px-2 py-1 inline-block border-2 border-black ${colorMap[course.color]?.bg || 'bg-gray-300'} ${colorMap[course.color]?.text || 'text-black'}`}>
                        {course.code}
                      </div>
                    </td>
                    <td className="p-3 text-black font-semibold">{course.name}</td>
                    <td className="p-3 text-center text-black font-semibold">{course.credits}</td>
                    <td className="p-3 text-center text-black font-semibold">{course.periods}</td>
                    <td className="p-3 text-black font-semibold">{course.teacher || '-'}</td>
                    <td className="p-3 text-black font-semibold">{course.room || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => { setEditingCourse(course); setShowModal('edit-course'); }} className="btn-mc btn-mc-blue px-3 py-1 text-sm font-bold">แก้ไข</button>
                        <button onClick={() => {
                          setConfirmOpts({ message: `ยืนยันการลบ ${course.code}?`, onConfirm: () => setCourses(courses.filter(c => c.id !== course.id)) });
                          setShowModal('confirm');
                        }} className="btn-mc btn-mc-red px-3 py-1 text-sm font-bold">ลบ</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderStudents() {
    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-black">จัดการข้อมูลนักเรียน</h2>
            <button onClick={() => { setEditingStudent(null); setShowModal('add-student'); }} className="btn-mc btn-mc-green px-6 py-3 font-bold">
              + เพิ่มนักเรียนใหม่
            </button>
          </div>
          <div className="space-y-2">
            {students.map(student => (
              <div key={student.id} className="minecraft-border bg-[#F5DEB3] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-14 h-14 bg-[#4CAF50] minecraft-border flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {student.studentId.slice(-2)}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-black">{student.name}</div>
                    <div className="text-sm text-black">รหัส: {student.studentId} | ห้อง: {student.class}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedStudentProfileId(student.id); setCurrentView('student-profile'); }} className="btn-mc bg-[#5D3A1A] text-[#F5DEB3] px-4 py-2 text-sm font-bold">ดูโปรไฟล์</button>
                  <button onClick={() => { setEditingStudent(student); setShowModal('edit-student'); }} className="btn-mc btn-mc-blue px-4 py-2 text-sm">แก้ไข</button>
                  <button onClick={() => setStudents(prev => prev.filter(s => s.id !== student.id))} className="btn-mc btn-mc-red px-4 py-2 text-sm">ลบ</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderStudentProfile() {
    const student = students.find(s => s.id === selectedStudentProfileId);
    if (!student) {
      return (
        <div className="animate-slide-in p-6 text-center bg-[#F5DEB3] opacity-80 font-bold border-4 border-dashed border-black/20">
          <h3 className="text-xl font-bold text-black/60 mb-4">โปรดเลือกนักเรียนเพื่อดูโปรไฟล์</h3>
          <button onClick={() => setCurrentView('students')} className="btn-mc btn-mc-blue px-6 py-2 inline-block">กลับไปหน้าจัดการนักเรียน</button>
        </div>
      );
    }

    const studentCourses = courses.filter(c => (enrollments[c.id] || []).includes(student.studentId));

    return (
      <div className="animate-slide-in space-y-6">
        <div className="card-mc-light p-6">
          <button onClick={() => setCurrentView('students')} className="btn-mc btn-mc-red px-4 py-2 mb-4 font-bold text-sm">
            &larr; ย้อนกลับ
          </button>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 bg-[#4CAF50] minecraft-border flex items-center justify-center text-white font-bold text-3xl">
              {student.studentId.slice(-2)}
            </div>
            <div>
              <h2 className="text-3xl font-bold text-black">{student.name}</h2>
              <p className="text-lg text-black font-semibold mt-1">รหัสนักเรียน: {student.studentId} | ชั้น: {student.class}</p>
            </div>
          </div>
          
          <div className="space-y-6 mt-6 border-t-2 border-black/20 pt-6">
            <h3 className="font-bold text-xl text-black">ผลการเรียนและการเข้าเรียน</h3>
            {studentCourses.length === 0 ? (
               <div className="p-4 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] text-black font-bold">
                 นักเรียนยังไม่ได้ลงทะเบียนรายวิชาใดๆ
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentCourses.map(course => {
                  const maxTaskScore = course.assignments?.reduce((s, a) => s + a.maxScore, 0) || 0;
                  const taskSum = (course.assignments || []).reduce((sum, a) => {
                    const key = `course_${course.id}_task_${a.id}`;
                    return sum + (student.scores[key] || 0);
                  }, 0);
                  
                  const midKey = `course_${course.id}_midterm`;
                  const finKey = `course_${course.id}_final`;
                  const midScore = student.scores[midKey] || 0;
                  const finScore = student.scores[finKey] || 0;
                  const totalScore = taskSum + midScore + finScore;
                  const grade = calculateGrade(totalScore);

                  let present = 0;
                  let absent = 0;
                  let late = 0;
                  let leave = 0;
                  
                  Object.keys(attendanceRecords).forEach(key => {
                    if (key.startsWith(`${course.id}-`)) {
                      const status = attendanceRecords[key][student.studentId];
                      if (status === 'present') present++;
                      if (status === 'absent') absent++;
                      if (status === 'late') late++;
                      if (status === 'leave') leave++;
                    }
                  });
                  const totalClasses = present + absent + late + leave;

                  return (
                    <div key={course.id} className="minecraft-border bg-white p-4 flex flex-col justify-between shadow-[4px_4px_0_0_#000]">
                      <div>
                        <h4 className="font-bold text-lg text-white bg-[#5D3A1A] p-2 truncate">{course.code} {course.name}</h4>
                        
                        <div className="mt-4 mb-4">
                          <p className="font-semibold text-black/70 mb-1 border-b border-black/10 pb-1">ผลการเรียน</p>
                          <div className="flex justify-between items-end mt-2">
                            <span className="font-bold text-4xl text-black leading-none">{grade}</span>
                            <span className="font-bold text-base text-black bg-[#F5DEB3] px-2 py-1 minecraft-border">คะแนนรวม: {totalScore.toFixed(0)}</span>
                          </div>
                   
                          <ul className="text-sm pt-2 mt-2 font-semibold space-y-1">
                            <li className="flex justify-between"><span>คะแนนเก็บ</span><span>{taskSum}/{maxTaskScore}</span></li>
                            <li className="flex justify-between"><span>กลางภาค</span><span>{midScore}</span></li>
                            <li className="flex justify-between"><span>ปลายภาค</span><span>{finScore}</span></li>
                          </ul>
                        </div>
                        
                        <div className="border-t-2 border-dashed border-black/20 pt-4 mt-2">
                          <p className="font-semibold text-black/70 mb-2">การเข้าเรียน ({totalClasses} ครั้ง)</p>
                          <div className="grid grid-cols-2 gap-2 text-sm font-bold bg-[#E8D5B7] p-2 minecraft-border">
                            <span className="text-green-700">มา: {present}</span>
                            <span className="text-red-700">ขาด: {absent}</span>
                            <span className="text-yellow-700">สาย: {late}</span>
                            <span className="text-blue-700">ลา: {leave}</span>
                          </div>
                        </div>

                        {(course.assignments && course.assignments.length > 0) && (
                          <div className="border-t-2 border-dashed border-black/20 pt-4 mt-4">
                            <p className="font-semibold text-black/70 mb-2">งานที่มอบหมาย</p>
                            <div className="space-y-2">
                              {course.assignments.map(a => {
                                const submission = (a.submissions || []).find(sub => sub.studentId === student.studentId);
                                const isOnline = a.submissionMethod === 'online';
                                const key = `course_${course.id}_task_${a.id}`;
                                const score = student.scores[key];
                                return (
                                  <div key={a.id} className="text-sm font-semibold bg-[#F5DEB3] p-2 minecraft-border flex justify-between items-center">
                                    <div className="truncate flex-1 mr-2">{a.name}</div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {isOnline && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${submission ? 'bg-green-600' : 'bg-red-500'}`}>
                                          {submission ? 'ส่งแล้ว' : 'ยังไม่ส่ง'}
                                        </span>
                                      )}
                                      <span className="font-bold">{score !== undefined ? score : '-'}/{a.maxScore}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderReports() {
    const selectedCourse = courses.find(c => c.id === currentCourseId);
    
    // Determine which students to show
    const studentsToDisplay = selectedCourse 
      ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId))
      : [];

    const exportCSV = () => {
      if (!selectedCourse) return;
      let csvContent = "data:text/csv;charset=utf-8,%EF%BB%BFรหัสนักเรียน,ชื่อ-นามสกุล,ห้อง,สถานะ,คะแนนรวม,เกรด\n";
      
      studentsToDisplay.forEach(s => {
        const taskSum = (selectedCourse.assignments || []).reduce((sum, a) => {
          const key = `course_${selectedCourse.id}_task_${a.id}`;
          return sum + (s.scores[key] || 0);
        }, 0);
        const midKey = `course_${selectedCourse.id}_midterm`;
        const finKey = `course_${selectedCourse.id}_final`;
        const midScore = s.scores[midKey] || 0;
        const finScore = s.scores[finKey] || 0;
        const totalScore = taskSum + midScore + finScore;
        
        const recordKey = `${selectedCourse.id}-${currentDate}`;
        const currentStatus = attendanceRecords[recordKey]?.[s.studentId];
        const statusText = currentStatus === 'present' ? 'มาเรียน' : currentStatus === 'absent' ? 'ขาดเรียน' : currentStatus === 'late' ? 'มาสาย' : currentStatus === 'leave' ? 'ลา' : '-';
        const gradeText = calculateGrade(totalScore);
        
        const row = `${s.studentId},${s.name},${s.class},${statusText},${totalScore},${gradeText}`;
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `report_${selectedCourse.code}_${currentDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const exportPDF = async () => {
      const input = document.getElementById('report-table-container');
      if (!input || !selectedCourse) return;
      
      try {
        const canvas = await html2canvas(input, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, pdfHeight);
        pdf.save(`report_${selectedCourse.code}_${currentDate}.pdf`);
      } catch (error) {
        console.error('Error generating PDF', error);
      }
    };

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">รายงานผล {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อดูรายงาน</h3>
             </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">ข้อมูล ณ วันที่:</span>
                  <input type="date" value={currentDate} onChange={(e) => setCurrentDate(e.target.value)} className="input-mc-dark text-white font-bold p-1 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="btn-mc btn-mc-blue px-4 py-2 font-bold whitespace-nowrap">ส่งออก CSV</button>
                  <button onClick={exportPDF} className="btn-mc btn-mc-red px-4 py-2 font-bold whitespace-nowrap">ส่งออก PDF</button>
                </div>
              </div>
              <div id="report-table-container" className="minecraft-border bg-[#F5DEB3] p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                <thead>
                  <tr className="bg-[#E8D5B7] minecraft-border">
                    <th className="p-3 text-left text-black font-bold">รหัส</th>
                    <th className="p-3 text-left text-black font-bold">ชื่อ-นามสกุล</th>
                    <th className="p-3 text-center text-black font-bold">สถานะ ({currentDate})</th>
                    <th className="p-3 text-center text-black font-bold">คะแนนรวม</th>
                    <th className="p-3 text-center text-black font-bold">เกรด</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsToDisplay.map(s => {
                    const taskSum = (selectedCourse.assignments || []).reduce((sum, a) => {
                      const key = `course_${selectedCourse.id}_task_${a.id}`;
                      return sum + (s.scores[key] || 0);
                    }, 0);
                    const midKey = `course_${selectedCourse.id}_midterm`;
                    const finKey = `course_${selectedCourse.id}_final`;
                    const midScore = s.scores[midKey] || 0;
                    const finScore = s.scores[finKey] || 0;
                    const totalScore = taskSum + midScore + finScore;
                    let statusText = '-';
                    let statusKey = '';
                    if (selectedCourse) {
                      const recordKey = `${selectedCourse.id}-${currentDate}`;
                      statusKey = attendanceRecords[recordKey]?.[s.studentId] || '';
                    } else {
                      statusKey = s.status;
                    }
                    
                    statusText = statusKey === 'present' ? 'มาเรียน' : statusKey === 'absent' ? 'ขาดเรียน' : statusKey === 'late' ? 'มาสาย' : statusKey === 'leave' ? 'ลา' : '-';
                    
                    return (
                      <tr key={s.id} className="minecraft-border bg-[#F5DEB3]">
                        <td className="p-3 text-black font-semibold">{s.studentId}</td>
                        <td className="p-3 text-black font-semibold">{s.name}</td>
                        <td className="p-3 text-center">
                          <span className={`badge-${statusKey || 'default'} inline-block px-3 py-1 text-xs`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="p-3 text-center text-black font-bold">{totalScore}</td>
                        <td className="p-3 text-center text-black font-bold">{calculateGrade(totalScore)}</td>
                      </tr>
                    )
                  })}
                  {studentsToDisplay.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center font-bold">ไม่มีข้อมูลนักเรียน</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      </div>
    );
  }

  function renderSettings() {
    const days = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'];
    
    const handleScheduleChange = (day: string, periodIndex: number, value: string) => {
      const courseId = value ? parseInt(value) : null;
      setSchedule(prev => {
        const next = { ...prev };
        const newPeriods = [...next[day]];
        newPeriods[periodIndex] = courseId;
        next[day] = newPeriods;
        return next;
      });
    };

    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-black">ตั้งค่าระบบ (Settings)</h2>
            <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="minecraft-border bg-[#F5DEB3] p-4 text-black">
              <h3 className="font-bold text-lg mb-4">ข้อมูลโรงเรียน</h3>
              <label className="block mb-2 font-bold">ชื่อโรงเรียน</label>
              <input 
                type="text" 
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="input-mc-light w-full"
              />
            </div>

            <div className="minecraft-border bg-[#F5DEB3] p-4 text-black">
              <h3 className="font-bold text-lg mb-4">การจัดการระบบ</h3>
              <p className="text-sm mb-4">ฟังก์ชันการจัดการสำหรับผู้ดูแลระบบ</p>
              
              <div className="flex flex-col gap-2">
                <button onClick={() => { 
                  setConfirmOpts({ message: 'ยืนยันลบข้อมูลนักเรียนทั้งหมด?', onConfirm: () => setStudents([]) });
                  setShowModal('confirm');
                }} className="btn-mc btn-mc-red px-4 py-3 font-bold w-full text-center">
                  ลบข้อมูลนักเรียนทั้งหมด
                </button>
                <button onClick={() => { 
                  setConfirmOpts({
                    message: 'ต้องการคืนค่าข้อมูลเริ่มต้นทั้งหมดหรือไม่?',
                    onConfirm: async () => {
                      setStudents(initialStudents); 
                      setClassesList(initialClassesList); 
                      setSchoolName('โรงเรียนน้ำคำวิทยา'); 
                      setSchedule(initialSchedule);
                      setCourses(initialCourses);
                      try {
                        await setDoc(doc(db, 'config', 'global'), {
                          schoolName: 'โรงเรียนน้ำคำวิทยา',
                          courses: initialCourses,
                          enrollments: initialEnrollments,
                          schedule: initialSchedule,
                          students: initialStudents,
                          classesList: initialClassesList,
                          attendanceRecords
                        });
                        alert('คืนค่าเริ่มต้นและบันทึกข้อมูลเข้าสู่ระบบเรียบร้อยแล้ว');
                      } catch (err) {
                        console.error(err);
                        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลเข้า Firebase');
                      }
                    }
                  });
                  setShowModal('confirm');
                }} className="btn-mc btn-mc-yellow px-4 py-3 font-bold w-full text-center">
                  คืนค่าเริ่มต้น (Reset Data)
                </button>
              </div>
            </div>
            
            <div className="minecraft-border bg-[#F5DEB3] p-4 text-black md:col-span-2">
              <h3 className="font-bold text-lg mb-4">จัดการตารางสอน</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#E8D5B7] minecraft-border">
                      <th className="p-3 text-center text-black font-bold whitespace-nowrap">วัน/คาบ</th>
                      {[1,2,3,4,5,6,7,8].map(p => (
                        <th key={p} className="p-3 text-center text-black font-bold">{p}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(day => (
                      <tr key={day} className="minecraft-border bg-[#F5DEB3]">
                        <td className="p-3 bg-[#E8D5B7] border-r-4 border-black text-center text-black font-bold">{day}</td>
                        {schedule[day].map((courseId, idx) => {
                          const course = courses.find(c => c.id === courseId);
                          return (
                            <td key={idx} className="p-2 border-l-2 border-black/20 min-w-[120px]">
                              {course ? (
                                <div className="group relative">
                                  <div className={`border-2 border-black p-2 cursor-pointer ${colorMap[course.color]?.bg || 'bg-gray-300'} ${colorMap[course.color]?.text || 'text-black'} flex flex-col items-center justify-center min-h-[5rem]`}>
                                    <div className="font-bold text-sm text-center leading-tight mb-1">{course.name}</div>
                                    <div className="text-xs text-center opacity-80 mb-1">({course.code})</div>
                                    {course.teacher && <div className="text-xs font-semibold text-center mt-1 truncate w-full" title={course.teacher}>{course.teacher}</div>}
                                    {course.room && <div className="text-[10px] text-center mt-0.5 opacity-90">{course.room}</div>}
                                  </div>
                                  <button 
                                    onClick={() => handleScheduleChange(day, idx, '')}
                                    className="hidden group-hover:flex absolute -top-2 -right-2 w-6 h-6 bg-red-600 border-2 border-black text-white items-center justify-center font-bold text-xs z-10"
                                  >
                                    X
                                  </button>
                                </div>
                              ) : (
                                <select 
                                  className="input-mc-light w-full text-xs font-bold p-1 h-14"
                                  onChange={(e) => handleScheduleChange(day, idx, e.target.value)}
                                  value=""
                                >
                                  <option value="">- ว่าง -</option>
                                  {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.code}</option>
                                  ))}
                                </select>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="minecraft-border bg-[#F5DEB3] p-4 text-black md:col-span-2">
              <h3 className="font-bold text-lg mb-4">จัดการห้องเรียน</h3>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newSettingsClass}
                  onChange={(e) => setNewSettingsClass(e.target.value)}
                  placeholder="เช่น ม.4/1"
                  className="input-mc-light flex-1"
                />
                <button 
                  onClick={async () => {
                    if (newSettingsClass && !classesList.includes(newSettingsClass)) {
                      const newClasses = [...classesList, newSettingsClass];
                      setClassesList(newClasses);
                      setNewSettingsClass('');
                      try {
                        await updateDoc(doc(db, 'config', 'global'), { classesList: newClasses });
                      } catch (err) {
                        console.error('Error auto-saving classesList', err);
                      }
                    }
                  }} 
                  className="btn-mc btn-mc-green px-4 py-2 font-bold"
                >
                  เพิ่มห้องเรียน
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {classesList.map(c => (
                  <div key={c} className="minecraft-border bg-[#E8D5B7] px-3 py-1 flex items-center justify-between gap-2">
                    <span className="font-bold text-lg">{c}</span>
                    <button 
                      onClick={() => {
                        setConfirmOpts({
                          message: `ต้องการลบห้อง ${c} ใช่หรือไม่?\nข้อมูลนักเรียนในห้องนี้จะไม่ถูกลบออกจนกว่าจะแก้ไขทีละคน`,
                          onConfirm: async () => {
                            const newClasses = classesList.filter(cls => cls !== c);
                            setClassesList(newClasses);
                            if (currentClass === c && newClasses.length > 0) {
                              setCurrentClass(newClasses[0] || '');
                            }
                            try {
                              await updateDoc(doc(db, 'config', 'global'), { classesList: newClasses });
                            } catch (err) {
                              console.error('Error auto-saving classesList on delete', err);
                            }
                          }
                        });
                        setShowModal('confirm');
                      }}
                      className="btn-mc btn-mc-red px-2 py-0 text-sm font-bold"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderLogin() {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card-mc-light p-8 max-w-md w-full animate-slide-in">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 bg-white minecraft-border flex items-center justify-center p-2 mb-4">
              <img src="https://i.postimg.cc/3xq869Sd/logo-learn-na-craft2.jpg" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h2 className="text-2xl font-bold text-center text-black">เข้าสู่ระบบ</h2>
            <p className="text-center font-semibold text-black/70 mt-2">{schoolName}</p>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const username = (e.currentTarget.elements.namedItem('username') as HTMLInputElement).value;
            const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
            
            if (username === 'admin' && password === '1234') {
              setCurrentUser({ role: 'teacher', username, name: 'นายธวัชชัย แก่นจักร์' });
              setCurrentView('dashboard');
            } else {
              const student = students.find(s => s.studentId === username);
              if (student && password === '1234') {
                setCurrentUser({ role: 'student', username, name: student.name });
                setCurrentView('dashboard');
              } else {
                alert('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
              }
            }
          }} className="space-y-4">
            <div>
              <label className="block mb-2 font-bold text-black">ชื่อผู้ใช้ (รหัสนักเรียน หรือ admin)</label>
              <input name="username" type="text" className="input-mc-light w-full p-3 font-bold" required />
            </div>
            <div>
              <label className="block mb-2 font-bold text-black">รหัสผ่าน</label>
              <input name="password" type="password" className="input-mc-light w-full p-3 font-bold" required />
            </div>
            <button type="submit" className="btn-mc btn-mc-green w-full py-4 text-xl font-bold mt-4">
              เข้าสู่ระบบ
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5DEB3] font-bold text-xl text-black">
        <div className="animate-spin w-12 h-12 border-4 border-black border-t-transparent rounded-full mb-4"></div>
        กำลังเชื่อมต่อข้อมูลจากระบบ (Firebase)...
      </div>
    );
  }

  if (!currentUser) {
    return renderLogin();
  }

  return (
    <div className="min-h-screen flex flex-col text-gray-900">
      {renderHeader()}
      <main className="container mx-auto px-4 py-6 flex-grow">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'schedule' && renderSchedule()}
        {currentView === 'activities' && renderActivities()}
        {currentView === 'enrollment' && renderEnrollment()}
        {currentView === 'courses' && renderCourses()}
        {currentView === 'attendance' && renderAttendance()}
        {currentView === 'tasks' && renderTasks()}
        {currentView === 'grading' && renderGrading()}
        {currentView === 'students' && renderStudents()}
        {currentView === 'student-profile' && renderStudentProfile()}
        {currentView === 'reports' && renderReports()}
        {currentView === 'settings' && renderSettings()}
      </main>
      <footer className="mt-auto pb-6 pt-4 text-center">
        <div className="inline-block minecraft-border bg-[#5D3A1A] px-6 py-3 text-[#F5DEB3] font-bold text-sm tracking-wide">
          &copy; 2026 ระบบบันทึกการมาเรียนและผลการเรียน : THAWATCHAI KANJAK
        </div>
      </footer>

      {showModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className={`card-mc-light p-6 w-full animate-slide-in ${showModal === 'view-submissions' || showModal === 'edit-course-scores' ? 'max-w-4xl' : 'max-w-md'}`}>
            {showModal === 'add-student' || showModal === 'edit-student' ? (
              <>
                <h3 className="text-2xl font-bold mb-4 text-black">{showModal === 'add-student' ? 'เพิ่มนักเรียนใหม่' : 'แก้ไขข้อมูลนักเรียน'}</h3>
                <form onSubmit={(e) => { e.preventDefault(); setShowModal(null); }} className="space-y-4">
                  <div>
                    <label className="block mb-2 font-bold text-black">รหัสนักเรียน</label>
                    <input type="text" className="input-mc-light w-full" placeholder="10009" defaultValue={editingStudent?.studentId} />
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">ชื่อ-นามสกุล</label>
                    <input type="text" className="input-mc-light w-full" placeholder="สมชาย ใจดี" defaultValue={editingStudent?.name} />
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">ห้องเรียน</label>
                    <select className="input-mc-dark w-full font-bold text-white bg-[#5D3A1A]" defaultValue={editingStudent?.class || currentClass}>
                      {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="btn-mc btn-mc-green px-6 py-3 flex-1 font-bold">บันทึก</button>
                    <button type="button" onClick={() => setShowModal(null)} className="btn-mc btn-mc-red px-6 py-3 font-bold">ยกเลิก</button>
                  </div>
                </form>
              </>
            ) : showModal === 'add-course' || showModal === 'edit-course' ? (
              <>
                <h3 className="text-2xl font-bold mb-4 text-black">{showModal === 'add-course' ? 'เพิ่มรายวิชาใหม่' : 'แก้ไขรายวิชา'}</h3>
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  const fd = new FormData(e.currentTarget);
                  const newCourse: Course = {
                    id: editingCourse?.id || Date.now(),
                    code: fd.get('code') as string,
                    name: fd.get('name') as string,
                    credits: parseFloat(fd.get('credits') as string),
                    periods: parseInt(fd.get('periods') as string),
                    color: fd.get('color') as string || 'blue',
                    assignments: editingCourse?.assignments || [{ id: 1, name: 'งาน 1', maxScore: 10 }, { id: 2, name: 'งาน 2', maxScore: 10 }, { id: 3, name: 'งาน 3', maxScore: 10 }, { id: 4, name: 'งาน 4', maxScore: 10 }],
                    midtermMaxScore: editingCourse?.midtermMaxScore ?? 30,
                    finalMaxScore: editingCourse?.finalMaxScore ?? 30,
                    teacher: fd.get('teacher') as string,
                    room: fd.get('room') as string,
                  };
                  if (showModal === 'add-course') {
                    setCourses([...courses, newCourse]);
                  } else {
                    setCourses(courses.map(c => c.id === newCourse.id ? newCourse : c));
                  }
                  setShowModal(null); 
                }} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-bold text-black">รหัสวิชา</label>
                      <input name="code" type="text" className="input-mc-light w-full" required defaultValue={editingCourse?.code} />
                    </div>
                    <div>
                      <label className="block mb-2 font-bold text-black">ชื่อวิชา</label>
                      <input name="name" type="text" className="input-mc-light w-full" required defaultValue={editingCourse?.name} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-bold text-black">หน่วยกิต</label>
                      <input name="credits" type="number" step="0.5" className="input-mc-light w-full" required defaultValue={editingCourse?.credits || 1.0} />
                    </div>
                    <div>
                      <label className="block mb-2 font-bold text-black">คาบ/สัปดาห์</label>
                      <input name="periods" type="number" className="input-mc-light w-full" required defaultValue={editingCourse?.periods || 2} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-bold text-black">ชื่อผู้สอน</label>
                      <input name="teacher" type="text" className="input-mc-light w-full" defaultValue={editingCourse?.teacher} />
                    </div>
                    <div>
                      <label className="block mb-2 font-bold text-black">สถานที่/ห้องเรียน</label>
                      <input name="room" type="text" className="input-mc-light w-full" defaultValue={editingCourse?.room} />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">สี</label>
                    <select name="color" className="input-mc-dark w-full font-bold text-white bg-[#5D3A1A]" defaultValue={editingCourse?.color || 'blue'}>
                      {Object.keys(colorMap).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="btn-mc btn-mc-green px-6 py-3 flex-1 font-bold">บันทึก</button>
                    <button type="button" onClick={() => setShowModal(null)} className="btn-mc btn-mc-red px-6 py-3 font-bold">ยกเลิก</button>
                  </div>
                </form>
              </>
            ) : showModal === 'add-assignment' || showModal === 'edit-assignment' ? (
              <>
                <h3 className="text-2xl font-bold mb-4 text-black">{showModal === 'add-assignment' ? 'เพิ่มงานใหม่' : 'แก้ไขโจทย์/งาน'}</h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const selectedCourse = courses.find(c => c.id === currentCourseId);
                  if (!selectedCourse) return;

                  const newAssignment: Assignment = {
                    id: editingAssignment?.id || Date.now(),
                    name: fd.get('name') as string,
                    maxScore: parseInt(fd.get('maxScore') as string) || 0,
                    dueDate: fd.get('dueDate') as string,
                    description: fd.get('description') as string,
                    submissionMethod: fd.get('submissionMethod') as string,
                    learningMaterialUrl: fd.get('learningMaterialUrl') as string,
                    submissions: editingAssignment?.submissions || [],
                  };

                  const updatedAssignments = showModal === 'add-assignment'
                    ? [...(selectedCourse.assignments || []), newAssignment]
                    : (selectedCourse.assignments || []).map(a => a.id === newAssignment.id ? newAssignment : a);

                  setCourses(courses.map(c => c.id === selectedCourse.id ? { ...c, assignments: updatedAssignments } : c));
                  setShowModal(null);
                  setEditingAssignment(null);
                }} className="space-y-4">
                  <div>
                    <label className="block mb-2 font-bold text-black">ชื่องาน/โจทย์ *</label>
                    <input name="name" type="text" className="input-mc-light w-full" required defaultValue={editingAssignment?.name} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 font-bold text-black">คะแนนเต็ม *</label>
                      <input name="maxScore" type="number" min="0" className="input-mc-light w-full" required defaultValue={editingAssignment?.maxScore ?? 10} />
                    </div>
                    <div>
                      <label className="block mb-2 font-bold text-black">กำหนดส่ง</label>
                      <input name="dueDate" type="date" className="input-mc-light w-full font-bold" defaultValue={editingAssignment?.dueDate} />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">รายละเอียด/โจทย์</label>
                    <textarea name="description" className="input-mc-light w-full h-24 p-2 font-semibold" defaultValue={editingAssignment?.description}></textarea>
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">วิธีการส่ง (เช่น ถ่ายรูป, ออนไลน์)</label>
                    <input name="submissionMethod" type="text" className="input-mc-light w-full" defaultValue={editingAssignment?.submissionMethod} />
                  </div>
                  <div>
                    <label className="block mb-2 font-bold text-black">ลิงก์สื่อการเรียน (ถ้ามี)</label>
                    <input name="learningMaterialUrl" type="url" className="input-mc-light w-full" defaultValue={editingAssignment?.learningMaterialUrl} placeholder="https://..." />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button type="submit" className="btn-mc btn-mc-green px-6 py-3 flex-1 font-bold">บันทึก</button>
                    <button type="button" onClick={() => { setShowModal(null); setEditingAssignment(null); }} className="btn-mc btn-mc-red px-6 py-3 font-bold">ยกเลิก</button>
                  </div>
                </form>
              </>
            ) : showModal === 'view-submissions' ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl font-bold text-black">ดูการส่งงานและให้คะแนน</h3>
                  <button onClick={() => setShowModal(null)} className="btn-mc bg-red-600 text-white px-4 py-2 font-bold">X ปิด</button>
                </div>
                <div className="border-4 border-dashed border-black/20 bg-[#F5DEB3] p-6 text-center opacity-80 mb-4">
                  <p className="font-bold text-black">จำลองหน้าจอตรวจงาน: ผลงานของนักเรียน (เช่น รูปภาพหรือไฟล์) จะแสดงที่นี่</p>
                  <p className="text-sm mt-2">เมื่อนักเรียนส่งงานแล้ว ครูสามารถคลิกดูและกรอกคะแนนได้ทันที</p>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {students.filter(s => {
                    const selectedCourse = courses.find(c => c.id === currentCourseId);
                    return selectedCourse ? (enrollments[selectedCourse.id] || []).includes(s.studentId) : false;
                  }).map(s => {
                    const selectedCourse = courses.find(c => c.id === currentCourseId);
                    const taskKey = selectedCourse && currentAssignmentId ? `course_${selectedCourse.id}_task_${currentAssignmentId}` : '';
                    const currentScore = s.scores[taskKey];
                    const assignmentDesc = selectedCourse?.assignments.find(a => a.id === currentAssignmentId);
                    
                    return (
                      <div key={s.id} className="minecraft-border bg-[#E8D5B7] p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                          <div className="font-bold text-black text-lg">{s.studentId} {s.name}</div>
                          <div className="text-sm text-black mb-2">
                             สถานะ: {currentScore !== undefined ? <span className="text-green-700 font-bold">ตรวจแล้ว ({currentScore} คะแนน)</span> : <span className="text-red-700 font-bold">ยังไม่ส่งงาน/รอตรวจ</span>}
                          </div>
                          <button className="text-sm text-blue-700 underline font-bold" onClick={() => alert('จำลองการเปิดดูไฟล์/รูปภาพงานของนักเรียน')}>ดูผลงานนักเรียน (จำลอง)</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="font-bold text-black text-sm">ให้คะแนน:</label>
                          <input 
                            type="number" 
                            min="0"
                            max={assignmentDesc?.maxScore || 100}
                            className="input-mc-light w-20 text-center py-2" 
                            placeholder={`/${assignmentDesc?.maxScore || 0}`}
                            value={currentScore !== undefined ? currentScore : ''}
                            onChange={(e) => handleUpdateTaskScore(s.id, taskKey, parseInt(e.target.value) || 0)}
                          />
                          <button onClick={() => alert('บันทึกคะแนนเรียบร้อย')} className="btn-mc btn-mc-green px-4 py-2 font-bold text-sm">บันทึก</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : showModal === 'confirm' && confirmOpts ? (
              <div className="text-center p-4">
                <h3 className="text-xl font-bold mb-6 text-black">{confirmOpts.message}</h3>
                <div className="flex gap-4 justify-center">
                  <button 
                    onClick={() => {
                      confirmOpts.onConfirm();
                      setShowModal(null);
                      setConfirmOpts(null);
                    }} 
                    className="btn-mc btn-mc-green px-8 py-3 font-bold text-lg"
                  >
                    ยืนยัน
                  </button>
                  <button 
                    onClick={() => {
                      setShowModal(null);
                      setConfirmOpts(null);
                    }} 
                    className="btn-mc btn-mc-red px-8 py-3 font-bold text-lg"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
