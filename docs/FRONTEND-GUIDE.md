# RMC-SAAS — Frontend Architecture & Developer Guide

> **Engineering Pack · Frontend Engineering Standards**
> React 18, TypeScript, Vite, TanStack Query v5, and shadcn/ui

---

## Table of Contents

1. [Architecture & Design Principles](#architecture--design-principles)
2. [Directory Structure](#directory-structure)
3. [Routing Architecture](#routing-architecture)
4. [State Management Patterns](#state-management-patterns)
   - [Server State (TanStack Query v5)](#server-state-tanstack-query-v5)
   - [Local & Mock State (Custom Hooks + localStorage)](#local--mock-state-custom-hooks--localstorage)
5. [UI Components & Design System](#ui-components--design-system)
6. [Notifications & Toast Patterns](#notifications--toast-patterns)
7. [Mapping & Geolocation (Leaflet)](#mapping--geolocation-leaflet)
8. [Data Visualization (Recharts)](#data-visualization-recharts)
9. [TypeScript Type System Conventions](#typescript-type-system-conventions)

---

## Architecture & Design Principles

The RMC-SAAS frontend is structured as a modern Single Page Application (SPA) prioritizing:

- **Modularity:** Every business domain has a dedicated page, hook, and TypeScript definition file.
- **Zero Global State Bloat:** We intentionally avoid heavy global state libraries (Redux, MobX). Server-synced state is managed via TanStack Query; UI state resides in local React hooks.
- **Accessible Design:** All components are built on top of Radix UI primitives and styled with Tailwind CSS via `shadcn/ui`.

---

## Directory Structure

```
src/
├── App.tsx                     # Top-level Router configuration & Providers
├── main.tsx                    # React DOM entry point
├── index.css                   # Global Tailwind CSS definitions & color tokens
├── lib/
│   ├── api.ts                  # ApiClient singleton for all HTTP calls
│   └── utils.ts                # cn() class merging utility (clsx + tailwind-merge)
├── types/                      # 19 TypeScript domain interfaces
│   ├── camera.ts
│   ├── anpr.ts
│   ├── trip.ts
│   ├── vehicle.ts
│   ├── driver.ts
│   └── ...
├── hooks/                      # 24 domain & utility hooks
│   ├── useGateCameras.ts       # React Query camera hook
│   ├── useANPREvents.ts        # React Query ANPR events hook
│   ├── useTripManagement.ts    # Trip state & CRUD hook
│   ├── use-toast.ts            # Radix UI toast hook
│   └── ...
├── components/
│   ├── AppSidebar.tsx          # Main navigation sidebar
│   ├── ui/                     # shadcn/ui generic primitives (Button, Dialog, etc.)
│   ├── gate/                   # Gate Monitor & ANPR components
│   ├── weighbridge/            # Weighbridge specific widgets
│   └── ...
└── pages/                      # 21 page route components
    ├── Index.tsx               # Dashboard
    ├── GateMonitor.tsx
    ├── Weighbridge.tsx
    └── ...
```

---

## Routing Architecture

Routing is configured in `src/App.tsx` using React Router v6:

```tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layout wrapped with SidebarProvider & TooltipProvider
<BrowserRouter>
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gate-monitor" element={<GateMonitor />} />
          <Route path="/weighbridge" element={<Weighbridge />} />
          <Route path="/loading-console" element={<LoadingConsole />} />
          <Route path="/dispatch" element={<DispatchApproval />} />
          <Route path="/trip-management" element={<TripManagement />} />
          <Route path="/trip-tracking" element={<TripTracking />} />
          <Route path="/vehicles" element={<VehicleManagement />} />
          <Route path="/drivers" element={<DriverManagement />} />
          <Route path="/database-setup" element={<DatabaseSetup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  </SidebarProvider>
</BrowserRouter>
```

---

## State Management Patterns

### Server State (TanStack Query v5)

Used for all MySQL-backed endpoints. Encapsulates caching, background refetching, and mutation invalidation.

```tsx
// Example from src/hooks/useGateCameras.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const useGateCameras = () => {
  const queryClient = useQueryClient();

  const { data: cameras = [], isLoading, error } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => apiClient.getCameras(),
    refetchInterval: 10000, // Background poll every 10s
  });

  const updateCamera = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Camera> }) =>
      apiClient.updateCamera(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });

  return { cameras, isLoading, error, updateCamera };
};
```

### Local & Mock State (Custom Hooks + localStorage)

For modules not yet connected to MySQL, custom hooks maintain local state and sync with `localStorage`:

```tsx
// Standard mock hook pattern
const STORAGE_KEY = 'rmc_vehicles_data';

export const useVehicleManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialMockVehicles;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = useCallback((newVehicle: Omit<Vehicle, 'id'>) => {
    const created: Vehicle = { ...newVehicle, id: `v-${Date.now()}` };
    setVehicles(prev => [created, ...prev]);
    toast.success('Vehicle registered successfully');
  }, []);

  return { vehicles, addVehicle };
};
```

---

## UI Components & Design System

All UI components adhere to the **shadcn/ui** design system:
- **Prims:** Located in `src/components/ui/` (e.g., `button.tsx`, `dialog.tsx`, `table.tsx`, `card.tsx`).
- **Icons:** We use `lucide-react` exclusively for iconography.
- **Component Naming Conventions:**
  - `[Domain]Card.tsx` — Summary / KPI widget.
  - `[Domain]Table.tsx` — Master records data table.
  - `[Domain]FormDialog.tsx` — Modal for create/edit.
  - `[Domain]DetailsDialog.tsx` — Modal for deep inspection.

---

## Notifications & Toast Patterns

The codebase uses two toast providers:
1. **Sonner:** `import { toast } from 'sonner';` (Recommended for modern, clean action feedback).
2. **shadcn use-toast:** `import { useToast } from '@/hooks/use-toast';` (Used for complex dismissible alerts).

Prefer `sonner` (`toast.success(...)`, `toast.error(...)`) for all new code.

---

## Mapping & Geolocation (Leaflet)

Trip tracking maps use `react-leaflet` with custom CSS markers:
- **Leaflet CSS:** Imported in `src/pages/TripTracking.tsx`.
- **Default Icon Fix:** Handled via `leaflet-defaulticon-compatibility` to prevent missing marker assets in Vite bundles.
- Coordinates in India: Centered around Maharashtra/Mumbai (`[19.0760, 72.8777]`).

---

## Data Visualization (Recharts)

Analytics and reports pages use `recharts` responsive containers:
```tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={turnaroundData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="timeSlot" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="durationMinutes" fill="#3b82f6" />
  </BarChart>
</ResponsiveContainer>
```

---

## TypeScript Type System Conventions

- Type files are co-located in `src/types/[domain].ts`.
- **Do not use `any`**: Explicitly model payloads and status enums.
- Use `type` for unions/primitives and `interface` for entity data objects.
- All date fields should be modeled as ISO 8601 string (`string`) in frontend types to reflect JSON serialization over the wire.

