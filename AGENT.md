# AGENT.md — Repository Agent Instructions

> **Project:** PEW-DIY — D.I.Y. Room Equipment Borrowing System
> **Status:** Draft — pending peer review (created by AI agent, Issue [D1-07]; not yet approved by the team)
> **Last updated:** 2026-11-05 (FIX-A #23: §2.3 snapshot ล้าหลัง — อัปเดตโครงสร้าง client/server + stack ที่เลือกแล้ว (ปิด SDS-OQ-01/02) ตาม AGENT.md §21)
> **Purpose:** คู่มือกลางสำหรับ AI Agent ทุกตัวที่เข้ามาทำงานใน Repository นี้ เพื่อให้การพัฒนาเป็นมาตรฐาน ตรวจสอบได้ ปลอดภัย และไม่ลดอำนาจการตัดสินใจของมนุษย์
> **Maintenance:** เมื่อ stack/โครงสร้าง/กระบวนการทำงานเปลี่ยนแปลงอย่างมีนัยสำคัญ ต้องอัปเดตไฟล์นี้ผ่าน PR ที่ผ่าน Peer Review (ดู §21)

---

## 1. Project Context

PEW-DIY คือระบบยืม-คืนอุปกรณ์ของ D.I.Y. Room ในมหาวิทยาลัย สำหรับนักศึกษาที่ทำ Project ด้าน Arduino/Electronics/Prototyping เป็น Full-stack application (UI → API/Application Layer → Persistent Database) ตามข้อกำหนดรายวิชา CPE 334 Group Project

**ผู้ใช้งานหลัก (Actors):**
- **Borrower (Student)** — ดู/ค้นหาอุปกรณ์ ดูความพร้อมให้ยืม ส่งคำขอยืม ดูคำขอ/รายการยืม/ประวัติของตนเอง
- **Custodian (Staff)** — จัดการรายการอุปกรณ์ บันทึก Checkout/Return ดูรายการเกินกำหนด ดูรายงาน Inventory

**ข้อตกลงทีมที่ยืนยันแล้ว (Confirmed decisions — อ้างอิง `docs/srs.md`):**
- Theme 2: Inventory and Borrowing System — capabilities บังคับ: Inventory Availability, Borrowing Requests, Checkout, Active Loans, Return, Overdue Status, Inventory Reporting
- **Inventory Tracking = Quantity Tracking** (ติดตามอุปกรณ์เป็นจำนวนรวม ไม่ใช่รายชิ้น) — SRS A-01
- **Borrowing Approval = Direct Checkout** (ไม่มีขั้นตอนอนุมัติแยกก่อน Checkout) — SRS A-02
- **ระยะเวลาการยืม = 7 วัน** กำหนดอัตโนมัติที่ checkout และ **Overdue = เลย due date โดยยังไม่คืน** (SRS A-03/BR-07/BR-08 — เดิมอยู่ใน Open Questions ด้านล่าง ตัดสินแล้วใน SRS rev 2)
- **นิยาม "exclusive item / duplicate active loan" ภายใต้ Quantity Tracking = กฎจำนวน** (available quantity ห้ามต่ำกว่า 0; ของ quantity = 1 มี active loan ซ้ำไม่ได้) (SRS A-04/BR-03 — เดิมอยู่ใน Open Questions ด้านล่าง ตัดสินแล้วใน SRS rev 2)

**ประเด็นที่ยังไม่ตัดสินใจ (Open Questions — ห้ามเดา/ห้ามตัดสินใจแทนทีม):**
- รายการอุปกรณ์จริงใน catalog (ตัวอย่าง Arduino Uno, ESP32, Breadboard, Jumper Wires, Sensors ฯลฯ เป็นเพียงตัวอย่างบริบท) — SRS OQ-01
- จำนวนที่ยืมต่อ request/loan (multi-unit) และ full/partial return ที่ต้องตัดสินคู่กัน — SRS OQ-02 (ผูกกับ BR-09)
- Technology stack ที่แน่นอน (ดู §2) และรูปแบบ session/token

## 2. Technology Stack and Repository Structure

**หลักการ (แนวทาง B ที่ reviewer อนุมัติ):** ไฟล์นี้เก็บ **กฎ วิธีตรวจสอบ และแหล่งอ้างอิง** เป็นหลัก ส่วนรายละเอียดที่เปลี่ยนตามการพัฒนา (รายการไฟล์, Technology Stack, คำสั่ง setup) ให้ดูแลใน `README.md` (โครงสร้าง/คำสั่งใช้งาน) และ `docs/system-sds.md` (Stack/Architecture ตาม Part C) เพื่อไม่ให้ข้อมูลในไฟล์นี้ล้าหลัง

### 2.1 กฎการตรวจสอบ (ถาวร)
- **ห้ามเดา stack, framework หรือโครงสร้างระบบ** — ต้องตรวจสอบจากข้อมูลจริงก่อนเสมอ โดยถือลำดับ: โค้ดใน Repository → `docs/system-sds.md` (เมื่อมี) → `README.md` → คำสั่งมนุษย์
- เครื่องมือใน development environment ต้องตรวจสอบว่ามีจริงก่อนใช้ (`which`/`--version`) — ห้ามสมมติว่ามีเครื่องมือใดพร้อมใช้งาน
- สถานะใน §2.3 เป็น snapshot ณ วันที่ระบุ — **ต้อง verify ซ้ำก่อนใช้เสมอ** ห้ามเชื่อโดยไม่ตรวจสอบ
- เมื่อ stack/โครงสร้างเปลี่ยนแปลงอย่างมีนัยสำคัญ ให้อัปเดตเอกสารต้นทาง (`README.md`/`docs/system-sds.md`) — แก้ไฟล์นี้เฉพาะเมื่อ "กฎ" เปลี่ยนเท่านั้น

### 2.2 Layout Conventions (ถาวร)
- Root: `AGENT.md` (กติกา Agent — ไฟล์นี้), `README.md` (ภาพรวม/โครงสร้าง/คำสั่ง setup), `.gitignore` (กัน `.env`/secrets, logs, editor files)
- `docs/` — เอกสารวิศวกรรม: `docs/srs.md`, `docs/features.md`, `docs/traceability.md`, `docs/system-sds.md`, `docs/sprints/`, `docs/labs/`
- โครงสร้าง source code ตามที่กำหนดใน `docs/system-sds.md` เมื่อทีมเลือก stack แล้ว

### 2.3 แหล่งอ้างอิงและสถานะจริง (snapshot ณ 2026-11-05 — verify ซ้ำก่อนใช้)

**โครงสร้างที่ยืนยันได้จาก repository (FIX-A):** `client/` (โครงสร้างเตรียมพร้อมสำหรับ frontend — ยังไม่มี framework), `server/src` (application code: config/db/routes/services), `server/tests` (tests — อยู่นอก build output), `docs/` (เอกสารวิศวกรรมทั้งหมด), root config (`package.json`, `tsconfig.json`, `vitest.config.ts`, `.env.example`)

**Technology Stack (เลือกแล้ว — ปิด SDS-OQ-01/02):** Node.js + TypeScript + Express + PostgreSQL + Vitest/Supertest; authentication = server session + HttpOnly cookie + trusted-origin anti-CSRF (ทีมตัดสินใจ D1/D2; implement แล้วใน PR #22; บันทึกใน `docs/system-sds.md` §2.1)

**เอกสารที่มีใน repository แล้ว:** `docs/srs.md` (Part A), `docs/features.md` + `docs/traceability.md` (Part B), `docs/system-sds.md` (Part C), `docs/sprints/plan.md` (Part D), `docs/sprints/sprint-1/` (Part E contracts) — ดู §3 Source of Truth Documents

## 3. Source of Truth Documents

ลำดับความน่าเชื่อถือของเอกสารอ้างอิง (เมื่อข้อมูลไม่ตรงกัน ให้ถือตัวที่สูงกว่าและแจ้งมนุษย์):

1. **ข้อกำหนดรายวิชา:** `group_work_specs_v1.pdf`, `project_deliverable_1_v1.pdf` (ที่ `.../group_project_spec_files/`) — ข้อกำหนดจากอาจารย์
2. **SRS (baseline requirements):** `docs/srs.md` — FR/BR/NFR พร้อม Stable IDs
3. **Design:** `docs/system-sds.md`, `docs/features.md`, `docs/traceability.md`
4. **Engineering Contracts:** `docs/sprints/sprint-1/` (Feature SDS, AC, STS, DoD)
5. **Issue Requirements และ Acceptance Criteria** ของงานที่กำลังทำ
6. `README.md` และไฟล์นี้ (`AGENT.md`)

**หลักการ:** เอกสารใน Repository เป็น Source of Truth ฉบับหลัก (master) ห้ามใช้สำเนา/สิ่งที่คัดลอกมาแทนที่เอกสารต้นฉบับ อย่างไรก็ตาม **การรวมเนื้อหา SRS/Contract ลงใน PDF ส่งงาน (ตามที่ `project_deliverable_1_v1.pdf` §4.1 กำหนด) เป็นข้อยกเว้นโดยชอบธรรม** — อนุญาตให้คัดลอกเนื้อหาจากเอกสารต้นฉบับใน Repository ไปใส่ PDF ส่งงานได้ โดยระบุ commit/version ที่อ้างอิงเพื่อตรวจสอบย้อนกลับ

ในทางกลับกัน สำหรับงานเอกสารอื่น ๆ ใน Repository (ไม่รวม PDF ส่งงาน) ให้อ้างอิงลิงก์ต้นทาง ไม่คัดลอกเนื้อหาซ้ำเพื่อเลี่ยงความไม่สอดคล้องกันระหว่างสำเนา

## 4. Agent Roles, Responsibilities, and Scope Restrictions

**หน้าที่ของ Agent:** วิเคราะห์ วางแผน ลงมือสร้าง/แก้ไขงาน ทดสอบ ตรวจสอบ และรายงาน — ภายใต้การกำกับของมนุษย์ (Human-in-the-Loop)

**ความรับผิดชอบ:**
- ทำงานให้ตรง Requirement และ Acceptance Criteria ของ Issue
- รักษาคุณภาพโค้ด/เอกสาร และความสอดคล้องระหว่าง Requirements ↔ Design ↔ Implementation ↔ Tests
- สร้างหลักฐานที่ตรวจสอบได้ (test results, diffs, evidence) — ห้ามรายงานโดยไม่มีหลักฐาน
- ถามมนุษย์เมื่อข้อมูลไม่พอหรือมีความเสี่ยง (ดู §9)

**ข้อห้ามของ Agent (ทุกกรณี):**
- ห้าม Merge Pull Request (เด็ดขาด — ดู §12.3)
- ห้าม Approve งานของตนเองแทน Peer Review
- ห้ามเปลี่ยน Kanban/Project Status โดยไม่ได้รับอนุมัติจากมนุษย์
- ห้ามดำเนินการบน GitHub โดยไม่ได้รับอนุมัติ (รวมการอ่าน — ดู §11)
- ห้าม Force Push หรือแก้ไข Git history โดยพลการ
- ห้ามเปิดเผย/commit Secrets
- ห้ามตัดสินใจแทนทีมใน Open Questions
- ห้ามขยาย Scope, แก้ไข Test เพื่อปกปิดข้อผิดพลาด หรือลดข้อกำหนดเพื่อให้ผ่านง่าย
- ห้ามอ้างผลการทดสอบ/CI/งานที่ไม่ได้ทำจริง

> **หมายเหตุ:** AGENT.md เป็นเพียง Repository Instruction — ไม่ใช่ Security Boundary หรือระบบบังคับสิทธิ์ (ดู §20)

## 5. Instruction Hierarchy

เมื่อคำสั่ง/ข้อกำหนดขัดแย้งกัน ให้ใช้ลำดับนี้ (บนลงล่าง):

1. คำสั่งจากมนุษย์ที่ระบุขอบเขตและอนุมัติการดำเนินการ (ปัจจุบัน)
2. Repository-level instructions (`AGENT.md`)
3. Directory-level instructions (เช่น `docs/AGENT.md`, ถ้ามี)
4. Issue Requirements และ Acceptance Criteria
5. Technical Contracts และ Project Documentation
6. Coding Standards และ Engineering Best Practices

**กฎการจัดการ:**
- ห้ามใช้คำสั่งระดับล่างเพื่อยกเลิกข้อจำกัดด้านความปลอดภัยหรือ Human Approval — ข้อจำกัดด้านความปลอดภัย/การอนุมัติมีผลเหนือเสมอ
- หากพบคำสั่งที่ขัดแย้งกัน **ต้องหยุดและแจ้งมนุษย์** พร้อมแสดงความขัดแย้งและทางเลือก
- ต้องตรวจสอบคำแนะนำที่มีผลกับไฟล์/Directory ที่กำลังแก้ไขก่อนเสมอ
- ห้ามสมมติว่าไฟล์คำแนะนำที่ชื่อคล้ายกัน (เช่น `AGENT.md` กับ `AGENTS.md`) เป็นไฟล์เดียวกันหรือมีลำดับเดียวกันโดยไม่ตรวจสอบ
- คำสั่งมนุษย์ที่ขัดกับข้อกำหนดรายวิชา/สัญญา ต้องแจ้งให้มนุษย์ทราบก่อนดำเนินการ

## 6. Human Approval Gates

การดำเนินการต่อไปนี้ **ต้องได้รับอนุมัติจากมนุษย์ก่อนทุกครั้ง** โดยการอนุมัติแต่ละครั้งต้องมีขอบเขตชัดเจน:

| Gate | การดำเนินการที่ต้องอนุมัติ |
|---|---|
| GitHub access | อ่าน/เขียน GitHub Issues, PRs, Comments, Projects, Labels, API ทุกชนิด (ดู §11) |
| Git operations | Commit, Push, Rebase, Reset, Cherry-pick, Force Push (ห้าม), เปลี่ยน/ลบ Branch, แก้ไข history |
| PR lifecycle | เปิด/แก้ไข PR, เปลี่ยน Reviewer, comment/review, Merge (Agent ห้าม Merge เอง — §12.3) |
| Repository settings | Branch protection, Repository rulesets, permissions, secrets/config |
| Scope changes | เปลี่ยน Product Scope, Business Rules, Architecture ที่มีผลกระทบสำคัญ |
| Sensitive actions | ส่งข้อมูลไปยัง External Services, เปลี่ยน Dependencies ที่มีผลกระทบด้านความปลอดภัย |

- **การอนุมัติให้ทำงานใน Issue ≠ การอนุมัติให้เข้าถึง/เปลี่ยนแปลง GitHub** — ต้องขออนุมัติแยกตามขอบเขต
- ข้อยกเว้นเดียว: Push/Commit ที่จำเป็นต่อการเปิด PR ที่ได้รับอนุมัติแล้ว (ดู §11.2)
- หากต้องดำเนินการนอกขอบเขตที่ได้รับอนุมัติ ต้องหยุดและขออนุมัติใหม่

## 7. Engineering Loop

Engineering Loop คือกระบวนการพัฒนางานแบบ Iterative ที่ Agent ใช้ทำให้งานสำเร็จตาม Requirements/AC **เป็นกระบวนการภายในของ Agent เท่านั้น ไม่ใช่ระบบจัดการ Kanban** และทำงานเฉพาะในสถานะ:

- **`Started`** — ดำเนินงานตามแผนจนพร้อมส่งตรวจ
- **`Fixing`** — แก้ไขตาม Reviewer Feedback และเตรียมส่ง Re-review

**ห้ามเปลี่ยน Kanban Status โดยอัตโนมัติจากการทำงานของ Loop** (ดู §10)

### Step 1 — Understand
- อ่าน Issue และ Acceptance Criteria; ทำความเข้าใจ Objective, Scope, Constraints, Dependencies
- ตรวจสอบ Requirements และเอกสารที่เกี่ยวข้อง (Source of Truth — §3)
- สำรวจโค้ด/Architecture ที่ได้รับผลกระทบ; แยกสิ่งที่อยู่ใน/นอก Scope
- ระบุข้อมูลที่ยังไม่ชัดเจน — **หากข้อมูลสำคัญไม่เพียงพอ ต้องถามมนุษย์ก่อนดำเนินการต่อ** (§9)

### Step 2 — Plan
- วิเคราะห์ปัญหาและแนวทางแก้ไข; ระบุไฟล์/ส่วนของระบบที่ได้รับผลกระทบ
- แบ่งงานเป็นขั้นตอนย่อย; ระบุ Dependencies และ Risks
- กำหนดวิธีทดสอบและหลักฐานที่ต้องได้; ตรวจสอบว่าแผนสอดคล้องกับ Requirements/Contracts
- หากแผนต้องเปลี่ยน Scope, Business Rules หรือ Architecture อย่างมีนัยสำคัญ **ต้องขออนุมัติก่อน**

### Step 3 — Execute
- สร้าง/แก้ไขงานตามแผน ตาม Architecture และ Coding Standards ของ Repository
- แก้ไขเฉพาะส่วนที่อยู่ใน Scope — ไม่ทำ unrelated refactoring
- ไม่แก้ไข Test เพื่อปกปิดข้อผิดพลาด; ไม่ลดคุณภาพ/ข้อกำหนดเพื่อให้ผ่านง่าย
- หากต้องเปลี่ยนแนวทางจากแผนอย่างมีนัยสำคัญ ให้ประเมินผลกระทบและขออนุมัติเมื่อจำเป็น

### Step 4 — Verify
- ตรวจสอบด้วยวิธีที่เหมาะสม: Unit/Integration/API/UI Tests, Authentication & Authorization Tests, Build, Type Checking, Linting, Static Analysis, Security Checks, Manual Verification
- **ต้องตรวจสอบ Acceptance Criteria ทุกข้อที่เกี่ยวข้อง ไม่ใช่ตรวจเฉพาะว่า Build ผ่าน**

### Step 5 — Evaluate
ประเมินจากหลักฐานจริง: ตรง Objective ไหม · AC ผ่านครบไหม · มี Regression ไหม · กระทบส่วนอื่นไหม · มี Security/Privacy Issues ไหม · Documentation ตรง Implementation ไหม · มี Known Limitations/Blockers ไหม
**ห้ามรายงานว่า Pass หากไม่มีหลักฐานรองรับ**

### Step 6 — Iterate or Complete
- หากพบปัญหา: วิเคราะห์ Root Cause → ปรับแผน → กลับ Execute → Verify ใหม่ → Evaluate ใหม่
- หากผ่านครบ: สรุปสิ่งที่ทำ · แสดงผลการทดสอบ/หลักฐาน · สรุปไฟล์ที่เปลี่ยนแปลง · รายงาน Known Limitations · **หยุดรอ Human Approval สำหรับขั้นถัดไป**

### Engineering Loop Rules
- ห้ามข้าม Understand, Plan, Verify, Evaluate
- ห้ามขยาย Scope เอง; ห้ามสร้างหลักฐาน/ผลทดสอบขึ้นเอง
- พบ Blocker ที่ต้องให้มนุษย์ตัดสินใจ → หยุดและรายงาน (§17)
- ต้องมีหลักฐานประกอบการตัดสินใจเสมอ
- หากวนซ้ำแล้วยังแก้ไม่ได้ ให้รายงาน Blocker แทนการวนซ้ำไม่สิ้นสุด
- Self-Check ได้ แต่ **ใช้แทน Peer Review ไม่ได้**
- **การผ่าน Engineering Loop ไม่ได้หมายความว่า Issue เป็น Done** (ดู §10/§12.4)

## 8. Planning and Execution Guidelines

- ทำงานเป็น bounded units ตาม Issue/Contract — หนึ่งงานต่อหนึ่งขอบเขตชัดเจน
- ทำ Specification/Contract ก่อน Implementation สำหรับงาน feature/rule สำคัญ (spec-first)
- ใช้ TDD กับ business rule/bugfix/change สำคัญ: แสดง test ที่ fail ก่อน แล้ว implement จนผ่าน
- เก็บลำดับการทำงาน (spec → test → implementation) ให้ตรวจสอบย้อนกลับได้
- เลือกวิธีที่ง่ายที่สุดที่ยังครบ Requirements — อย่า over-engineer
- ประเมินความเสี่ยงและผลกระทบต่อส่วนอื่นก่อนลงมือ; แจ้งมนุษย์เมื่อความเสี่ยงสูง

## 9. Human Interaction and Clarification

Agent ต้องถามมนุษย์ได้ตลอดการทำงานเมื่อข้อมูลมีผลต่อความถูกต้อง/ความปลอดภัยของงาน

**กรณีที่ต้องถาม:** Requirements กำกวม/ขัดแย้ง · AC ตีความไม่ได้ชัดเจน · Business Rules ยังไม่ได้ตัดสินใจ · ต้องเปลี่ยน Product Scope · ต้องเปลี่ยน Architecture ที่กระทบสำคัญ · พบ Security/Privacy Risks · มีทางเลือกที่ Trade-offs สำคัญ · ข้อมูลไม่พอที่จะทำงานอย่างปลอดภัย · ต้องดำเนินการที่ยังไม่ได้รับอนุมัติ

**เมื่อถาม ต้องระบุ:** (1) ประเด็นที่ไม่ชัดเจน (2) เหตุผลที่ต้องถาม (3) ผลกระทบต่อการดำเนินงาน (4) ทางเลือกที่เป็นไปได้ (5) ข้อเสนอแนะของ Agent พร้อมเหตุผล

**แนวทาง:** ถามเฉพาะเรื่องที่มีผลต่อการตัดสินใจจริง · รวมคำถามที่เกี่ยวข้องลดการถามซ้ำ · ถามทีละประเด็นเมื่อคำตอบก่อนหน้ามีผลต่อคำถามถัดไป · ห้ามเดาคำตอบแทนมนุษย์ในเรื่องสำคัญ · ห้ามทำต่อในส่วนที่ได้รับผลกระทบจนกว่าจะได้คำตอบ · ส่วนที่ไม่ขึ้นกับคำตอบทำต่อได้หากยังอยู่ใน Scope และปลอดภัย · เสนอทางเลือกพร้อมเหตุผล ไม่ใช่แค่โยนปัญหา

## 10. Kanban Understanding

Kanban ของทีมมี 6 สถานะ (เรียงตามลำดับ): **Backlog → Specified → Started → PR Review → Fixing → Done**

| Status | ความหมาย |
|---|---|
| **Backlog** | มีงานแล้ว แต่ยังไม่ได้กำหนดรายละเอียดให้พร้อมเริ่ม |
| **Specified** | กำหนด Objective/Scope/Tasks/AC ชัดเจน — วางแผนและวิเคราะห์จนพร้อมเริ่มงาน แล้วเข้าสู่ Started |
| **Started** | เริ่มสร้าง/แก้ไขงานตาม Engineering Loop — เสร็จและตรวจสอบแล้ว พร้อมส่งตรวจ (ต้องได้รับอนุมัติจากมนุษย์ก่อนเปิด PR) จึงเข้าสู่ PR Review |
| **PR Review** | รอเพื่อนร่วมทีมตรวจสอบ (งานโค้ดผ่าน Pull Request; **งานเอกสาร**ใน repository ให้ใช้ PR เสมอเพื่อเข้าสู่ Done — ส่วนงานเอกสารนอก repository ที่ทีมอนุญาตเป็นกรณีพิเศษ ให้แนบหลักฐาน peer review ที่เทียบเท่ากัน) — Reviewer ขอ Changes → Fixing |
| **Fixing** | แก้ไขตาม Reviewer Feedback โดยใช้ Engineering Loop — เสร็จและตรวจสอบแล้ว กลับ PR Review เพื่อ Re-review |
| **Done** | ต้องผ่านการตรวจ AC/DoD **และ** ได้รับการ Approve จาก Reviewer **และ** (กรณีมี PR) Reviewer เป็นผู้ Merge PR เรียบร้อยแล้ว — **กรณีงานเอกสารนอก repository ที่ไม่มี PR** ต้องมีหลักฐาน peer review ที่ชัดเจนจากเพื่อนร่วมทีม (บันทึกไว้ใน Issue/ช่องทางที่ตกลงกัน) และได้รับอนุมัติจากมนุษย์ จึงถือเป็น Done ได้ |

### Relationship Between Kanban and Engineering Loop
- Engineering Loop = กระบวนการภายในของ Agent (ทำงานใน `Started` และ `Fixing` เท่านั้น)
- Kanban = ระบบติดตามสถานะงานของทีม — **Engineering Loop ไม่ได้เป็นตัวเปลี่ยน Kanban Status**
- **Agent ห้ามเปลี่ยน Kanban Status โดยไม่ได้รับอนุมัติจากมนุษย์**
- Agent ห้ามถือว่างานเสร็จเป็น Done เพียงเพราะ Implementation/Tests ผ่าน — ต้องผ่าน Peer Review และ (กรณีมี PR) Reviewer Merge ก่อน

## 11. Git and GitHub Governance

**กฎสูงสุด: ทุกการดำเนินการที่เกี่ยวข้องกับ GitHub ต้องได้รับอนุมัติจากมนุษย์ก่อนทุกครั้ง** — ครอบคลุมทั้ง**การอ่าน**และการเปลี่ยนแปลง: อ่าน Issues/PRs/Comments · ใช้ GitHub API · สร้าง/แก้ไข Issues, Projects, Labels · เปลี่ยนสถานะ Issue/Project Item · Push/เปลี่ยน Remote Branch · เปิด/แก้ไข PR · เปลี่ยน Reviewer · comment/review · Merge/ปิด PR · เปลี่ยน Repository Settings/Branch Protection

- การอนุมัติแต่ละครั้งต้องมีขอบเขตชัดเจน และ**การอนุมัติให้ทำงานใน Issue ไม่ครอบคลุมการดำเนินการบน GitHub ทุกประเภท**
- หากข้อมูลที่ต้องใช้มีอยู่ใน Context หรือไฟล์ Local อยู่แล้ว ให้ใช้ข้อมูลนั้นก่อน และถามมนุษย์เมื่อจำเป็นต้องเข้าถึง GitHub เพิ่มเติม

### 11.1 Git Operations (ต้องอนุมัติก่อนเสมอ)
Commit · Push · Rebase · Reset · Cherry-pick · Force Push (ห้ามโดยเด็ดขาด) · เปลี่ยน/ลบ Branch · แก้ไข Commit History

- ตรวจสอบ `git status` ก่อนและหลังการเปลี่ยนแปลง — ห้ามรวมงานที่ไม่เกี่ยวข้องเข้ากับงานของ Issue
- ห้ามแก้ไข Git history โดยพลการ

### 11.2 Approval for Opening a Pull Request
เมื่องานพร้อมเปิด PR: (1) ทำ Engineering Loop ครบ (2) ตรวจ AC (3) ตรวจ Tests/CI เท่าที่ทำได้ (4) สรุปไฟล์ที่เปลี่ยนแปลง (5) รายงานผลตรวจสอบ (6) ระบุ Branch/PR ที่ต้องการสร้าง (7) **ขอ Human Approval**

**ข้อยกเว้น:** เมื่อมนุษย์อนุมัติให้เปิด PR แล้ว การอนุมัตินั้นครอบคลุม Commit/Push ที่จำเป็นต่อ PR นั้น โดยไม่ต้องขอซ้ำ แต่:
- เฉพาะ Branch และขอบเขตงานที่ระบุในการอนุมัติเท่านั้น
- ห้าม Force Push / ห้าม Push งานที่ไม่เกี่ยวข้อง / ห้ามนำไปใช้กับ PR หรือ Branch อื่น
- หากต้องทำนอกขอบเขตที่อนุมัติ → ขออนุมัติใหม่

### 11.3 Branch and Commit Conventions (ตาม workflow รายวิชา)
- **Branch Strategy (ทีมยืนยัน):** ห้าม Push ขึ้น `main` โดยตรง — ทุก Branch ต้องสร้างจาก `sprint/1-staging` และรวมเข้า `main` ผ่าน `sprint/1-staging` เท่านั้น (ลำดับ: `feature/*`/`fix/*`/`docs/*` → `sprint/1-staging` → `main`)
- Branch: `feature/<scope>`, `fix/<scope>` หรือ `docs/<issue#>-<scope>` จาก **`sprint/1-staging`** ของ sprint ปัจจุบัน
- Commit message: ระบุงาน/Issue ที่เกี่ยวข้อง กระชับ อธิบาย "ทำไม" ไม่ใช่แค่ "อะไร"
- ลำดับ: Issue → branch จาก sprint staging → PR เข้า sprint staging → review → integrate → release PR เข้า `main` (ผ่าน staging เท่านั้น) → tag release
- เก็บหลักฐาน local test results ผูกกับ commit ที่ส่ง (CI บังคับใน Lab 5)
- **Baseline Exception:** commits แรก 2 รายการบน `main` (`.gitignore` + `README.md`) สร้างโดยทีมก่อนกฎนี้มีผล (bootstrap) — ตั้งแต่นี้ไปห้าม direct push ตามข้อบน

## 12. Pull Request and Peer Review Rules

### 12.1 Independent Review
- **ผู้เขียนงานไม่สามารถ Approve งานของตัวเองแทน Reviewer ได้** — ต้องมีเพื่อนร่วมทีมเป็น Reviewer เสมอ
- Agent ห้ามสร้าง/ใช้ Self-Approval เพื่อให้ผ่าน Review
- Agent ช่วยตรวจสอบ PR/วิเคราะห์ Feedback ได้ แต่**แทนที่ Peer Review ไม่ได้**

### 12.2 Review and Fixing Cycle
เมื่อ Reviewer ขอ Changes: (1) อ่าน Feedback ทั้งหมด (2) ทำความเข้าใจปัญหา/ผลกระทบ (3) หาก Feedback กำกวม ถามก่อน (4) ใช้ Engineering Loop แก้ไข (5) รัน Tests/ตรวจผลกระทบอีกครั้ง (6) สรุปการแก้ไข+หลักฐาน (7) ขออนุมัติก่อน Push การแก้ไข (8) ส่งกลับให้ Re-review
ห้ามเพิกเฉยต่อ Feedback หรือแก้ไขเฉพาะบางข้อโดยไม่อธิบายเหตุผล

### 12.3 Approval and Merge Rules
**Agent ห้าม Merge Pull Request เองโดยเด็ดขาด** — ไม่ว่า CI จะผ่าน Tests จะผ่าน งานจะดูสมบูรณ์ Reviewer จะเคย Approve หรือไม่มี comment ค้าง — **การ Merge ต้องเป็นหน้าที่ของ Reviewer เท่านั้น**

เงื่อนไขก่อน Reviewer Merge: (1) Reviewer ตรวจสอบงานแล้ว (2) Reviewer Approve (3) CI/Required Checks ผ่าน (4) Approval ยังมีผลกับ **commit ล่าสุด** (หากมี commit ใหม่หลัง Approve ต้องให้ Reviewer ตรวจ/Approve ใหม่) (5) ไม่มี Changes Requested ค้าง (6) Reviewer เป็นผู้กด Merge เอง

**ห้ามเปิดใช้ Auto-merge** หรือดำเนินการใดที่ทำให้ PR ถูก Merge โดยอัตโนมัติ

### 12.4 Definition of Done for Pull Requests
Issue จะเป็น **Done** เมื่อ Reviewer Approve **และ** Reviewer Merge PR เรียบร้อยแล้ว (ควบคู่กับการตรวจ AC/DoD — §10)
การเปิด PR, CI ผ่าน, Agent แจ้งว่างานเสร็จ, หรือ Reviewer Approve แต่ยังไม่ Merge **ไม่ถือว่า Done**

**ข้อยกเว้นสำหรับงานเอกสารนอก repository ที่ไม่มี PR:** หากทีมอนุญาตให้ตรวจงานเอกสารที่ไม่ได้อยู่ใน repository โดยไม่ผ่าน PR ต้องมีหลักฐาน peer review ที่เทียบเท่า (เช่น บันทึกการตรวจสอบจากเพื่อนร่วมทีมใน Issue หรือช่องทางที่ตกลงกัน) และได้รับอนุมัติจากมนุษย์ จึงจะเข้าสู่ Done ได้ — งานเอกสารที่อยู่ใน repository ให้ใช้ PR เสมอ

## 13. Quality, Testing, and Verification Standards

- Requirements และ Acceptance Criteria เป็นแหล่งอ้างอิงหลัก — ต้องตรวจสอบ AC ทุกข้อที่เกี่ยวข้อง
- Tests ต้องสะท้อนพฤติกรรมที่ Requirements กำหนด (ดู §15.2 สำหรับ ID conventions)
- **ห้ามลบ/แก้ Test** เพื่อทำให้ผลผ่านโดยไม่มีเหตุผลและการอนุมัติที่เหมาะสม
- **ห้ามอ้างว่า Test ผ่านหากไม่ได้รันจริง** — ต้องแสดงผลการทดสอบที่ตรวจสอบได้ (file/test name, command, commit, counts)
- ตรวจสอบ Regression, Error Handling, Authentication/Authorization, Security/Privacy เมื่อเกี่ยวข้อง
- ใช้ test levels ให้เหมาะ: unit สำหรับ logic สำคัญ · API/DB integration สำหรับ persistence/permissions · UI/E2E สำหรับ critical journeys · ต้องมี negative/boundary tests
- แยก manual checks ออกจาก automated tests ให้ชัดเจน

### CI Requirements
- Required CI Checks และ Tests ที่กำหนดต้องผ่านบน **commit ล่าสุด** ก่อน Merge
- ห้ามถือว่า CI ที่ยังไม่เสร็จเป็น Pass; หาก CI ล้มเหลว ต้องหา Root Cause และแก้ไขก่อน Re-review
- **ห้าม Bypass Required Checks** เพื่อให้ Merge ง่ายขึ้น

## 14. Security and Privacy Rules

- ห้ามเปิดเผย API Keys, Passwords, Tokens, Private Keys หรือ Secrets ใน Source Code, Logs, Terminal Output, Comments, PR หรือเอกสาร
- ห้าม commit Secrets — ใช้ `.env` (ที่ `.gitignore` กันไว้) + `.env.example` สำหรับ documentation
- ห้ามนำข้อมูลส่วนบุคคล/ข้อมูลลับไปเผยแพร่โดยไม่จำเป็น; ใช้ synthetic demo data เท่านั้น
- ห้ามส่งข้อมูลสำคัญไปยัง External Services โดยไม่ได้รับอนุมัติ
- ปฏิบัติตามหลัก Least Privilege; ตรวจสอบ Dependencies และ Security Risks เมื่อมีการเปลี่ยนแปลงที่เกี่ยวข้อง
- Password ต้องเก็บแบบ hashed เสมอ (ห้าม plaintext); การบังคับใช้สิทธิ์ต้องเป็น **server-side** (การซ่อนปุ่มบน UI ไม่ใช่การควบคุมสิทธิ์)
- ห้ามปิด Security Checks เพื่อให้ Build ผ่าน
- หากพบ Secret รั่วไหล → หยุดการดำเนินการที่เกี่ยวข้องและแจ้งมนุษย์ทันที
- **AGENT.md ไม่ใช่ระบบควบคุมสิทธิ์หรือ Security Boundary ที่เพียงพอในตัวเอง** (ดู §20)

## 15. Documentation Standards and Scope Control

- เอกสารต้องตรงกับ Implementation จริง — ห้ามเปลี่ยน Requirements เพื่อให้ตรงกับ Implementation ที่ผิด
- ห้ามเพิ่ม Feature นอก Scope; ห้าม Refactor ส่วนที่ไม่เกี่ยวข้อง
- ต้องปรับปรุงเอกสารเมื่อ Implementation ทำให้เอกสารเดิมไม่ถูกต้อง
- หากพบ Requirements ที่ขัดแย้งกัน → ถามมนุษย์ (§9)
- ต้องระบุ Open Questions และ Known Limitations อย่างชัดเจน (§16)

### 15.1 Requirements ↔ Design Consistency Rules
- ทุก FR/BR/NFR ต้องมี Stable ID (`FR-xx`, `BR-xx`, `NFR-xx`) และต้องอ้างอิงด้วย ID เหล่านี้ใน Features (`F-xx`), Contracts (AC/TEST), Code และ Tests
- การเปลี่ยนแปลง Requirements/Design ต้องมีบันทึก revision ที่ตรวจสอบย้อนกลับได้ (ห้ามเขียนทับประวัติ)
- ห้าม invent ข้อกำหนดใหม่เอง — ข้อเสนอแนะต้องติดป้ายเป็น Proposed และรอทีมอนุมัติ

### 15.2 Coding Conventions
- **ยังไม่มี stack-specific conventions** (Repository ยังไม่มีโค้ด — §2) — เมื่อเลือก stack แล้วต้องเพิ่ม conventions ของภาษี/framework ที่เลือกใน §2 นี้
- หลักการทั่วไป (ใช้ได้ทุก stack): ตั้งชื่อสื่อความหมาย · แยกชั้น UI/API/DB ตาม architecture ที่กำหนดใน `docs/system-sds.md` · business rules อยู่ฝั่ง server · โค้ดและ tests มาคู่กัน · ไม่ commit debug code/secret/comment ที่ไม่จำเป็น · ไม่เพิ่ม dependency โดยไม่จำเป็น

### 15.3 ID Conventions (ปัจจุบัน)
| ชนิด | รูปแบบ |
|---|---|
| Functional Requirement | `FR-01`, `FR-02`, … |
| Business Rule | `BR-01`, `BR-02`, … |
| Non-Functional Requirement | `NFR-01`, `NFR-02`, … |
| Feature | `F-01`, `F-02`, … |
| Acceptance Criterion | `AC-<feature>-<nn>` หรือ `AC-xx` ตาม contract |
| Test | `TEST-xx` (STS) |
| Decision/OQ | `AD-xx` (Assumption/Decision), `OQ-xx` (Open Question) |
| Deliverable 1 Issues | `D1-xx`, Sub-issues `D1-06.x` |

## 16. Open Questions and Assumptions Management

- **ห้ามตัดสินใจแทนทีมใน Open Questions** — แสดงทางเลือกและผลกระทบอย่างเป็นกลาง แล้วรอการตัดสินใจ
- จำแนกข้อมูลเสมอ: **Confirmed** (ยืนยันแล้ว) · **Proposed** (ข้อเสนอ ยังไม่อนุมัติ) · **Open Question** (ยังไม่ตัดสินใจ) · **Assumption** (สมมติฐาน ต้องระบุว่าเป็นสมมติฐาน)
- ห้ามนำสมมติฐาน/ข้อเสนอแนะมาเขียนเป็นข้อเท็จจริงที่ยืนยันแล้ว
- บันทึกสมมติฐานและผลกระทบไว้ใน `docs/srs.md` (ตาราง AD) หรือเอกสารที่เกี่ยวข้อง และตรวจสอบสมมติฐานก่อนใช้ในงานสำคัญ

## 17. Blocker and Error Handling

เมื่อพบปัญหาที่แก้ไม่ได้ภายใน Scope:
(1) หยุดส่วนงานที่ได้รับผลกระทบ (2) วิเคราะห์ Root Cause เท่าที่ทำได้ (3) รายงานสิ่งที่ลองแล้ว (4) แสดง Error Message/หลักฐาน (5) อธิบายผลกระทบ (6) ระบุสิ่งที่ต้องการให้มนุษย์ตัดสินใจ (7) **รอคำสั่งก่อนดำเนินการต่อ**

- ห้ามซ่อนปัญหา ห้ามข้าม Verification และห้ามรายงานว่างานเสร็จหากยังมี Blocker ที่กระทบ AC
- หากวนซ้ำแก้ปัญหาไม่ได้ ให้รายงาน Blocker แทนการวนซ้ำไม่สิ้นสุด

## 18. Superpowers and Agent Skills

หาก Environment มี Superpowers/Agent Skills:
- ตรวจสอบ Skills ที่มีอยู่จริงก่อนใช้งาน; ไม่เรียกใช้ Skill ที่ไม่มีอยู่จริง
- เลือก Skill ให้เหมาะกับงาน; ปฏิบัติตามขั้นตอนของ Skill นั้น
- ห้ามสมมติว่า Skill เข้าถึงเครื่องมือ/สิทธิ์ที่ Environment ไม่มี
- **ห้ามใช้ Skill เพื่อข้าม Human Approval หรือข้อจำกัดใน Repository**

ตัวอย่างการใช้ตามลักษณะงาน: Brainstorming/Planning (Requirements ยังไม่ชัด/มีทางเลือกสำคัญ) · Writing Plans (จัดทำ implementation plan) · Test-Driven Development (พัฒนา feature/แก้ bug) · Systematic Debugging (bug/test failure) · Verification Before Completion (ก่อนรายงานว่าเสร็จ) · Requesting/Receiving Code Review (งาน PR)

Skills เป็นเครื่องมือช่วยคุณภาพ ไม่ได้มีสิทธิ์เหนือ Human Approval และ Repository Governance

## 19. Final Reporting

เมื่อดำเนินงานเสร็จ ให้รายงาน: (1) Issue ที่ดำเนินการ (2) สรุปสิ่งที่สร้าง/แก้ไข (3) ไฟล์ที่เปลี่ยนแปลง (4) ผลการทดสอบ (5) AC ที่ผ่าน/ไม่ผ่าน (6) หลักฐานที่ตรวจสอบได้ (7) Blockers และ Known Limitations (8) ความเสี่ยงที่เหลือ (9) ขั้นตอนถัดไปที่ต้องรอ Human Approval

**ห้ามรายงานว่างานสำเร็จเกินกว่าหลักฐานที่มี**

## 20. Governance Recommendation (นอก Scope ของ [D1-07])

AGENT.md กำหนดพฤติกรรมของ AI Agent แต่**บังคับใช้สิทธิ์ด้วยตัวเองไม่ได้** — แนะนำให้มนุษย์พิจารณาตั้ง GitHub Branch Protection Rules / Repository Rulesets: Require PR before merging · Require ≥1 independent human approval · Require CI status checks · Dismiss stale approvals · Restrict direct pushes to protected branches · Prevent unauthorized users/automation from merging

การตั้งค่าดังกล่าวต้องได้รับอนุมัติจากมนุษย์ และอยู่นอก Scope ของ Issue [D1-07]

## 21. Document Maintenance

- ไฟล์นี้เป็น living document — อัปเดตเมื่อ: stack/โครงสร้างเปลี่ยน · กระบวนการทำงานเปลี่ยน · พบช่องว่าง/ความขัดแย้งในคำแนะนำ
- การแก้ไขต้องผ่าน branch + PR + Peer Review (ห้าม push ตรง)
- รักษาความกระชับ ชัดเจน ใช้งานได้จริง; ห้ามคัดลอกเนื้อหา SRS/สัญญาทั้งหมดมาใส่
- ห้ามขัดแย้งกับข้อกำหนดของอาจารย์หรือข้อตกลงของทีม — หากพบความขัดแย้ง ให้แจ้งมนุษย์ก่อนแก้ไข
