import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserPlus, UsersRound } from "lucide-react";
import {
  STAFF_PERMISSIONS,
  createStaff,
  getStaffErrorMessage,
  listStaff,
  updateStaffPermissions,
  updateStaffStatus,
  type StaffUser,
} from "../../../services/staffService";

export function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createFormOpen, setCreateFormOpen] = useState(false);
  const [busyStaffId, setBusyStaffId] = useState<string | null>(null);
  const [pageError, setPageError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    setPageError("");
    try {
      setStaff(await listStaff());
    } catch (error) {
      setPageError(getStaffErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const permissions = values.getAll("permissions").map(String);
    setIsCreating(true);
    setActionMessage("");
    setPageError("");
    try {
      const created = await createStaff({
        name: String(values.get("name") ?? "").trim(),
        email: String(values.get("email") ?? "").trim(),
        password: String(values.get("password") ?? ""),
        permissions,
      });
      setStaff((current) => [created, ...current]);
      setActionMessage("Staff account created.");
      setCreateFormOpen(false);
      form.reset();
    } catch (error) {
      setPageError(getStaffErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  }

  async function handleStatusChange(member: StaffUser) {
    const action = member.is_active ? "deactivate" : "activate";
    if (!window.confirm(`Are you sure you want to ${action} ${member.name}?`)) {
      return;
    }

    setBusyStaffId(member.id);
    setActionMessage("");
    setPageError("");
    try {
      const updated = await updateStaffStatus(member.id, !member.is_active);
      setStaff((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setActionMessage(`Staff account ${action}d.`);
    } catch (error) {
      setPageError(getStaffErrorMessage(error));
    } finally {
      setBusyStaffId(null);
    }
  }

  async function handlePermissionUpdate(
    event: FormEvent<HTMLFormElement>,
    member: StaffUser,
  ) {
    event.preventDefault();
    const permissions = new FormData(event.currentTarget)
      .getAll("permissions")
      .map(String);
    setBusyStaffId(member.id);
    setActionMessage("");
    setPageError("");
    try {
      const updated = await updateStaffPermissions(member.id, permissions);
      setStaff((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setActionMessage(`Permissions updated for ${updated.name}.`);
    } catch (error) {
      setPageError(getStaffErrorMessage(error));
    } finally {
      setBusyStaffId(null);
    }
  }

  return (
    <section
      aria-labelledby="staff-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="staff-title"
          >
            Staff Management
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Admins manage the internal team’s system access.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          onClick={() => setCreateFormOpen((open) => !open)}
          type="button"
        >
          <UserPlus aria-hidden="true" size={18} />
          {createFormOpen ? "Cancel" : "Add staff member"}
        </button>
      </div>

      {pageError && (
        <div
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <span>{pageError}</span>
          <button
            className="font-semibold underline"
            onClick={() => void loadStaff()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}
      {actionMessage && (
        <p
          className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          role="status"
        >
          {actionMessage}
        </p>
      )}

      {createFormOpen && (
        <form
          className="mt-5 space-y-5 rounded-lg border border-slate-200 bg-white p-5"
          onSubmit={(event) => void handleCreate(event)}
        >
          <h2 className="font-semibold text-slate-900">Create staff account</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Name
              <input
                autoComplete="name"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal"
                maxLength={120}
                minLength={1}
                name="name"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Email
              <input
                autoComplete="email"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Temporary password
              <input
                autoComplete="new-password"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2.5 font-normal"
                maxLength={72}
                minLength={9}
                name="password"
                required
                type="password"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Use at least 9 characters with uppercase, lowercase, and a
                special character.
              </span>
            </label>
          </div>
          <PermissionCheckboxes />
          <button
            className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "Creating…" : "Create staff account"}
          </button>
        </form>
      )}

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {isLoading ? (
          <p className="px-5 py-14 text-center text-sm text-slate-600" role="status">
            Loading staff…
          </p>
        ) : !pageError && staff.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mb-3 inline-flex rounded-full bg-slate-100 p-3 text-slate-500">
              <UsersRound aria-hidden="true" size={22} />
            </span>
            <p className="font-medium text-slate-900">No staff records</p>
            <p className="mt-1 text-sm text-slate-500">
              Staff accounts created by an administrator will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {staff.map((member) => (
              <article className="p-5" key={member.id}>
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-slate-900">
                      {member.name}
                    </h2>
                    <p className="truncate text-sm text-slate-600">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        member.is_active
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.is_active ? "Active" : "Inactive"}
                    </span>
                    <button
                      className="text-sm font-medium text-blue-700 hover:text-blue-800 disabled:opacity-60"
                      disabled={busyStaffId === member.id}
                      onClick={() => void handleStatusChange(member)}
                      type="button"
                    >
                      {member.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Manage permissions ({member.permissions.length})
                  </summary>
                  <form
                    className="mt-4 space-y-4"
                    onSubmit={(event) =>
                      void handlePermissionUpdate(event, member)
                    }
                  >
                    <PermissionCheckboxes
                      key={`${member.id}-${member.permissions.join(",")}`}
                      permissions={member.permissions}
                    />
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                      disabled={busyStaffId === member.id}
                      type="submit"
                    >
                      Save permissions
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function PermissionCheckboxes({
  permissions = [],
}: {
  permissions?: readonly string[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-slate-700">
        Assigned permissions
      </legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {STAFF_PERMISSIONS.map((permission) => (
          <label
            className="flex items-center gap-2 text-sm text-slate-700"
            key={permission}
          >
            <input
              defaultChecked={permissions.includes(permission)}
              name="permissions"
              type="checkbox"
              value={permission}
            />
            {permission}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
