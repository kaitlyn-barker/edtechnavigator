# EdTech Navigator

A static website that helps educators, administrators, and parents discover, evaluate, and compare educational technology tools for K–12 schools.

## Overview

EdTech Navigator is a searchable database of 106+ edtech products organized by category, grade level, pricing, and audience. Each user role gets a tailored experience with curated tools, implementation guides, and a personal saved-tools list.

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero section, featured tools carousel, role-based entry points |
| For Teachers | `teachers.html` | Tools browser, implementation guides, peer reviews |
| For Parents | `parents.html` | Family-friendly tools, parent guides, FAQ |
| For Administrators | `admin.html` | District solutions, policy guides, evaluation checklists |
| My Tools List | `account.html` | Saved tools (persisted via localStorage) |
| Guide pages | `guide-*.html` | 18 in-depth guides organized by role and topic |

## Tech Stack

- Plain HTML5, CSS3, and vanilla JavaScript — no build tools or frameworks required
- Google Fonts (Inter)
- localStorage for the "My Tools List" feature

## Running Locally

Open any `.html` file directly in a browser. No server or build step is needed.

```
open index.html
```

## Project Structure

```
edtechnavigator/
├── index.html                        # Homepage
├── teachers.html                     # For Teachers
├── parents.html                      # For Parents
├── admin.html                        # For Administrators
├── account.html                      # My Tools List
├── guide-*.html                      # 18 guide pages
├── edtech-tools.js                   # Master tools database (106 tools)
├── filter-sort.js                    # Shared filter/sort UI system
└── my-tools.js                       # localStorage save/unsave utilities
```
