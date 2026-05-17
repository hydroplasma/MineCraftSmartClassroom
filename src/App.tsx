import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

type Status = 'present' | 'absent' | 'late' | 'leave' | 'none';
type View = 'dashboard' | 'attendance' | 'schedule' | 'courses' | 'tasks' | 'grading' | 'students' | 'reports' | 'settings' | 'enrollment' | 'activities';

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

interface Assignment {
  id: number;
  name: string;
  maxScore: number;
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
}

const initialCourses: Course[] = [
  { id: 1, code: 'ว21101', name: 'วิทยาศาสตร์', credits: 1.5, periods: 3, color: 'purple', assignments: [{id: 1, name: 'งาน 1 (ใบงาน)', maxScore: 10}, {id: 2, name: 'งาน 2 (ทดลอง)', maxScore: 20}, {id: 3, name: 'สมุด', maxScore: 10}], midtermMaxScore: 30, finalMaxScore: 30 },
  { id: 2, code: 'ค21101', name: 'คณิตศาสตร์', credits: 1.5, periods: 4, color: 'blue', assignments: [{id: 1, name: 'แบบฝึกหัดบทที่ 1', maxScore: 20}, {id: 2, name: 'แบบฝึกหัดบทที่ 2', maxScore: 20}], midtermMaxScore: 30, finalMaxScore: 30 },
];

const initialEnrollments: Record<number, string[]> = {
  1: ['10001', '10002', '10003', '10004', '10005', '10006'],
  2: ['10001', '10002', '10003', '10004', '10005', '10006']
};

const initialSchedule: Record<string, (number | null)[]> = {
  'จันทร์': [1, null, null, null, null, null, null, null],
  'อังคาร': [null, 2, null, null, null, null, null, null],
  'พุธ': [null, null, null, null, null, null, null, null],
  'พฤหัสบดี': [null, null, null, null, null, null, null, null],
  'ศุกร์': [null, null, null, null, null, null, null, null]
};

const initialStudents: Student[] = [
  { id: 1, name: 'กิตติชัย สุขสมบูรณ์', studentId: '10001', class: 'ม.1/1', status: 'present', time: '07:45', scores: { assignment: 35, midterm: 25, final: 25 } },
  { id: 2, name: 'ณัฐวุฒิ ใจดี', studentId: '10002', class: 'ม.1/1', status: 'present', time: '07:50', scores: { assignment: 38, midterm: 28, final: 28 } },
  { id: 3, name: 'สมชาย รักเรียน', studentId: '10003', class: 'ม.1/1', status: 'late', time: '08:15', scores: { assignment: 30, midterm: 20, final: 20 } },
  { id: 4, name: 'สุดา เก่งมาก', studentId: '10004', class: 'ม.1/1', status: 'absent', time: null, scores: { assignment: 40, midterm: 30, final: 30 } },
  { id: 5, name: 'วิชัย มุ่งมั่น', studentId: '10005', class: 'ม.1/1', status: 'present', time: '07:40', scores: { assignment: 20, midterm: 15, final: 18 } },
  { id: 6, name: 'มาลี ตั้งใจเรียน', studentId: '10006', class: 'ม.1/1', status: 'leave', time: '07:55', scores: { assignment: 32, midterm: 22, final: 24 } },
];

const classesList = ['ม.1/1', 'ม.1/2', 'ม.2/1', 'ม.2/2', 'ม.3/1', 'ม.3/2'];
const initialClassesList = ['ม.1/1', 'ม.1/2', 'ม.2/1', 'ม.2/2', 'ม.3/1', 'ม.3/2'];

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
  const [currentClass, setCurrentClass] = useState('ม.1/1');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');
  
  const handleSaveData = () => {
    alert('บันทึกข้อมูลเรียบร้อยแล้ว');
  };
  
  const [showModal, setShowModal] = useState<'add-student' | 'edit-student' | 'add-course' | 'edit-course' | 'edit-course-scores' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

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
                    <img src="https://i.postimg.cc/SsLxCD1v/download.png" alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <p className="text-[#F5DEB3] text-sm mt-2 text-center whitespace-nowrap">{schoolName}</p>
                </div>
                <div className="flex items-center h-16">
                  <h1 className="text-2xl md:text-3xl font-bold text-white leading-snug">ระบบบันทึกการมาเรียนและผลการเรียน</h1>
                </div>
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-start w-full gap-2 border-t border-black/20 pt-4">
              <button onClick={() => setCurrentView('dashboard')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'dashboard' ? 'btn-mc-green' : ''}`}>แดชบอร์ด</button>
              <button onClick={() => setCurrentView('schedule')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'schedule' ? 'btn-mc-green' : ''}`}>ตารางสอน</button>
              <button onClick={() => setCurrentView('attendance')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'attendance' ? 'btn-mc-green' : ''}`}>เช็คชื่อ</button>
              <button onClick={() => setCurrentView('tasks')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'tasks' ? 'btn-mc-green' : ''}`}>คะแนนเก็บ</button>
              <button onClick={() => setCurrentView('grading')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'grading' ? 'btn-mc-green' : ''}`}>ผลการเรียน</button>
              <button onClick={() => setCurrentView('reports')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'reports' ? 'btn-mc-green' : ''}`}>รายงาน</button>
              <button onClick={() => setCurrentView('activities')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'activities' ? 'btn-mc-green' : ''}`}>จัดการเรียนรู้และสร้างกิจกรรม</button>
              <button onClick={() => setCurrentView('enrollment')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'enrollment' ? 'btn-mc-green' : ''}`}>ลงทะเบียนเรียน</button>
              <button onClick={() => setCurrentView('courses')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'courses' ? 'btn-mc-green' : ''}`}>จัดการรายวิชา</button>
              <button onClick={() => setCurrentView('students')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'students' ? 'btn-mc-green' : ''}`}>จัดการนักเรียน</button>
              <button onClick={() => setCurrentView('settings')} className={`btn-mc flex-1 sm:flex-none whitespace-nowrap px-4 py-2 font-semibold text-center ${currentView === 'settings' ? 'btn-mc-green' : ''}`}>ตั้งค่า</button>
              
              {['attendance', 'tasks', 'grading', 'reports', 'activities', 'enrollment'].includes(currentView) && (
                <div className="flex items-center gap-2 mt-2 md:mt-0 bg-[#5D3A1A] p-2 minecraft-border ml-auto">
                  <span className="text-[#F5DEB3] font-bold whitespace-nowrap text-sm">เลือกรายวิชา:</span>
                  <select 
                    value={currentCourseId || ''} 
                    onChange={(e) => setCurrentCourseId(e.target.value ? parseInt(e.target.value) : null)} 
                    className="input-mc-dark font-bold py-1 px-2 text-sm max-w-[200px]"
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
                              <div className={`border-2 border-black p-2 ${colorMap[course.color]?.bg || 'bg-gray-300'} ${colorMap[course.color]?.text || 'text-black'}`}>
                                <div className="font-bold text-sm text-center">{course.code}</div>
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
    const selectedCourse = courses.find(c => c.id === currentCourseId);
    const studentsToRender = selectedCourse ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId)) : [];
    
    return (
      <div className="animate-slide-in">
        <div className="card-mc-light p-6 mb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-black">บันทึกคะแนนเก็บ {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : ''}</h2>
            {selectedCourse && (
              <button onClick={handleSaveData} className="btn-mc btn-mc-green px-6 py-2 font-bold whitespace-nowrap">บันทึก</button>
            )}
          </div>
          {!selectedCourse ? (
             <div className="p-12 text-center border-4 border-dashed border-black/20 bg-[#F5DEB3] opacity-80">
               <h3 className="text-xl font-bold text-black/60">โปรดเลือกรายวิชาจากมุมขวาบนเพื่อบันทึกคะแนนเก็บ</h3>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#E8D5B7] minecraft-border">
                    <th className="p-3 text-left text-black font-bold whitespace-nowrap">รหัส</th>
                    <th className="p-3 text-left text-black font-bold whitespace-nowrap">ชื่อ-นามสกุล</th>
                    {(selectedCourse.assignments || []).map(a => (
                      <th key={a.id} className="p-3 text-center text-black font-bold whitespace-nowrap">{a.name} ({a.maxScore})</th>
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
          )}
        </div>
      </div>
    );
  }

  function renderGrading() {
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
                    <td className="p-3 text-center">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => { setEditingCourse(course); setShowModal('edit-course'); }} className="btn-mc btn-mc-blue px-3 py-1 text-sm font-bold">แก้ไข</button>
                        <button onClick={() => {
                          if(confirm(`ยืนยันการลบ ${course.code}?`)) setCourses(courses.filter(c => c.id !== course.id));
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

  function renderReports() {
    const selectedCourse = courses.find(c => c.id === currentCourseId);
    
    // Determine which students to show
    const studentsToDisplay = selectedCourse 
      ? students.filter(s => (enrollments[selectedCourse.id] || []).includes(s.studentId))
      : [];

    const exportCSV = () => {
      if (!selectedCourse) return;
      let csvContent = "data:text/csv;charset=utf-8,รหัสนักเรียน,ชื่อ-นามสกุล,ห้อง,สถานะ,คะแนนรวม,เกรด\n";
      
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
        <div className="card-mc-light p-6">
          <h2 className="text-2xl font-bold mb-6 text-black">ตั้งค่าระบบ (Settings)</h2>

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
                <button onClick={() => { if(confirm('ยืนยันระบบข้อมูลนักเรียนทั้งหมด?')) setStudents([]); }} className="btn-mc btn-mc-red px-4 py-3 font-bold w-full text-center">
                  ลบข้อมูลนักเรียนทั้งหมด
                </button>
                <button onClick={() => { 
                  if(confirm('ต้องการคืนค่าข้อมูลเริ่มต้นทั้งหมดหรือไม่?')) {
                    setStudents(initialStudents); 
                    setClassesList(initialClassesList); 
                    setSchoolName('โรงเรียนน้ำคำวิทยา'); 
                    setSchedule(initialSchedule);
                    setCourses(initialCourses);
                  }
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
                                  <div className={`border-2 border-black p-2 cursor-pointer ${colorMap[course.color]?.bg || 'bg-gray-300'} ${colorMap[course.color]?.text || 'text-black'}`}>
                                    <div className="font-bold text-sm text-center">{course.code}</div>
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
                  onClick={() => {
                    if (newSettingsClass && !classesList.includes(newSettingsClass)) {
                      setClassesList([...classesList, newSettingsClass]);
                      setNewSettingsClass('');
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
                        if (confirm(`ต้องการลบห้อง ${c} ใช่หรือไม่?\nข้อมูลนักเรียนในห้องนี้จะไม่ถูกลบออกจนกว่าจะแก้ไขทีละคน`)) {
                          setClassesList(classesList.filter(cls => cls !== c));
                          if (currentClass === c && classesList.length > 1) {
                            setCurrentClass(classesList.find(cls => cls !== c) || '');
                          }
                        }
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
          <div className="card-mc-light p-6 max-w-md w-full animate-slide-in">
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
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
