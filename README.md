# Silsilah App - Family Tree Visualization

A modern web application for visualizing family trees using Next.js, React, and Supabase. The app provides an interactive way to explore family relationships with a clean, responsive interface.

## Features

- Interactive family tree visualization
- Expandable/collapsible nodes
- Mobile-responsive design
- Real-time data from Supabase
- Visual indicators for node states
- Easy navigation and refresh functionality

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Supabase
- react-d3-tree

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd silsilah-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

- Click on nodes to expand/collapse branches
- Blue nodes indicate expanded state
- Red nodes indicate collapsed state
- Use the refresh button to reset the tree view
- The tree automatically adjusts to screen size

## Database Schema

The application uses a `family_members` table in Supabase with the following structure:

```sql
CREATE TABLE family_members (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  birth_year TEXT,
  notes TEXT,
  phone_number TEXT,
  address TEXT,
  generation INTEGER NOT NULL,
  parent_id INTEGER REFERENCES family_members(id),
  spouse_id INTEGER REFERENCES family_members(id)
);
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 