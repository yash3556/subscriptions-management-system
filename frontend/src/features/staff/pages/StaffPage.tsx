import { UserPlus, UsersRound } from "lucide-react";

export function StaffPage() {
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
          aria-describedby="staff-create-help"
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600"
          disabled
          title="Staff creation is unavailable until the backend account contract is defined."
          type="button"
        >
          <UserPlus aria-hidden="true" size={18} />
          Add staff member
        </button>
      </div>
      <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900" id="staff-create-help">
        Only an admin may add staff. The problem statement does not define the
        staff account fields or creation flow, so this action remains disabled
        until the backend contract is available.
      </p>
      <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-3.5" scope="col">Email</th>
                <th className="px-5 py-3.5" scope="col">Role</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-5 py-14 text-center" colSpan={2}>
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <span className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">
                      <UsersRound aria-hidden="true" size={22} />
                    </span>
                    <p className="font-medium text-slate-900">
                      No staff records available
                    </p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Staff records will appear here when the account API is
                      connected.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
