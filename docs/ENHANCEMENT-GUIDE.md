# RMC-SAAS — Enhancement & Developer Playbook

> **Engineering Pack · Developer Recipes & Code Blueprints**
> How to add new features, build API routes, and migrate mock modules to MySQL

---

## Table of Contents

1. [Developer Blueprint: End-to-End Feature Addition](#developer-blueprint-end-to-end-feature-addition)
2. [Recipe 1: Adding a New Database Table](#recipe-1-adding-a-new-database-table)
3. [Recipe 2: Adding a New Backend API Route](#recipe-2-adding-a-new-backend-api-route)
4. [Recipe 3: Extending the Frontend `ApiClient`](#recipe-3-extending-the-frontend-apiclient)
5. [Recipe 4: Creating a New Custom Hook](#recipe-4-creating-a-new-custom-hook)
6. [Recipe 5: Adding a New Page & Navigation Item](#recipe-5-adding-a-new-page--navigation-item)
7. [Full Walkthrough: Migrating Trip Management to MySQL](#full-walkthrough-migrating-trip-management-to-mysql)
8. [Code Review & PR Checklist](#code-review--pr-checklist)

---

## Developer Blueprint: End-to-End Feature Addition

When adding a full-stack capability to RMC-SAAS, follow this 5-stage pipeline:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. Database │ ──► │  2. Backend  │ ──► │ 3. ApiClient │ ──► │   4. Hook    │ ──► │   5. Page    │
│  Schema DDL  │     │ Express Route│     │ (lib/api.ts) │     │ (React Query)│     │  Component   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

---

## Recipe 1: Adding a New Database Table

1. Open `server/db.js`.
2. Locate `initializeDatabase()`.
3. Add your `CREATE TABLE IF NOT EXISTS` statement:

```javascript
// In server/db.js
await pool.query(`
  CREATE TABLE IF NOT EXISTS driver_leave_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE
  )
`);
```

---

## Recipe 2: Adding a New Backend API Route

1. Open `server/index.js`.
2. Add your REST handler using the `pool`:

```javascript
// In server/index.js
app.get('/api/drivers/:id/leaves', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      'SELECT * FROM driver_leave_records WHERE driver_id = ? ORDER BY start_date DESC',
      [id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/drivers/:id/leaves', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, reason } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO driver_leave_records (driver_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)',
      [id, start_date, end_date, reason]
    );
    
    res.status(201).json({ id: result.insertId, message: 'Leave record created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Recipe 3: Extending the Frontend `ApiClient`

1. Open `src/lib/api.ts`.
2. Add the method to the `ApiClient` class:

```typescript
// In src/lib/api.ts
export interface DriverLeave {
  id: number;
  driver_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

class ApiClient {
  // Existing methods...

  async getDriverLeaves(driverId: string): Promise<DriverLeave[]> {
    return this.request<DriverLeave[]>(`/drivers/${driverId}/leaves`);
  }

  async createDriverLeave(driverId: string, data: Partial<DriverLeave>): Promise<{ id: number }> {
    return this.request<{ id: number }>(`/drivers/${driverId}/leaves`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
```

---

## Recipe 4: Creating a New Custom Hook

1. Create `src/hooks/useDriverLeaves.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, DriverLeave } from '@/lib/api';
import { toast } from 'sonner';

export const useDriverLeaves = (driverId: string) => {
  const queryClient = useQueryClient();

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['driver-leaves', driverId],
    queryFn: () => apiClient.getDriverLeaves(driverId),
    enabled: Boolean(driverId),
  });

  const applyLeave = useMutation({
    mutationFn: (data: Partial<DriverLeave>) => apiClient.createDriverLeave(driverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-leaves', driverId] });
      toast.success('Leave applied successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to apply leave');
    },
  });

  return { leaves, isLoading, applyLeave };
};
```

---

## Recipe 5: Adding a New Page & Navigation Item

1. Create `src/pages/LeaveManagement.tsx`.
2. Register the route in `src/App.tsx`:
   ```tsx
   <Route path="/driver-leaves" element={<LeaveManagement />} />
   ```
3. Add the navigation item in `src/components/AppSidebar.tsx`:
   ```tsx
   {
     title: "Driver Leaves",
     url: "/driver-leaves",
     icon: CalendarOff,
     group: "Fleet",
   }
   ```

---

## Full Walkthrough: Migrating Trip Management to MySQL

Here is the exact pattern to convert `src/hooks/useTripManagement.ts` from `localStorage` to **MySQL**:

### Step 1: Add Backend Routes (`server/index.js`)
```javascript
// GET all trips with optional status filtering
app.get('/api/trips', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM trips';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const [trips] = await pool.query(query, params);
    res.json(trips);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE a trip
app.post('/api/trips', async (req, res) => {
  try {
    const { id, registration_no, driver_id, customer_id, grade, ordered_qty } = req.body;
    await pool.query(
      `INSERT INTO trips (id, registration_no, driver_id, customer_id, grade, ordered_qty, status)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled')`,
      [id || `trip-${Date.now()}`, registration_no, driver_id, customer_id, grade, ordered_qty]
    );
    res.status(201).json({ success: true, tripId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Step 2: Add to `src/lib/api.ts`
```typescript
async getTrips(status?: string): Promise<Trip[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return this.request<Trip[]>(`/trips${query}`);
}

async createTrip(data: Partial<Trip>): Promise<{ success: boolean; tripId: string }> {
  return this.request('/trips', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
```

### Step 3: Refactor Hook (`src/hooks/useTripManagement.ts`)
Replace `localStorage.getItem` with TanStack Query's `useQuery`:
```typescript
export const useTripManagement = () => {
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => apiClient.getTrips(),
  });

  const createTrip = useMutation({
    mutationFn: (newTrip: Partial<Trip>) => apiClient.createTrip(newTrip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip created in database');
    },
  });

  return { trips, isLoading, createTrip };
};
```

---

## Code Review & PR Checklist

Before submitting code changes:
- [ ] TypeScript compiles cleanly: `npx tsc --noEmit`
- [ ] No SQL queries with raw string concatenation (always use `?` params)
- [ ] Database qualified references use backticks: `` `RMC-SAAS` ``
- [ ] Error toasts provide clear feedback using `sonner`
- [ ] Responsive UI verified on mobile and desktop viewports
- [ ] React Query keys properly invalidated on mutations

