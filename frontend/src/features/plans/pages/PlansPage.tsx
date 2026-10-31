import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PlanFormDialog } from "../components/PlanFormDialog";
import { PlanSearch } from "../components/PlanSearch";
import { PlanTable } from "../components/PlanTable";
import type { PlanFormValues, PlanRecord } from "../types";

const plans: PlanRecord[] = [];

export function PlansPage() {
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanRecord | null>(null);
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  const filteredPlans = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return plans;
    return plans.filter((plan) => plan.name.toLocaleLowerCase().includes(query));
  }, [search]);

  function handleSubmit(_values: PlanFormValues) {
    setNotice(
      `Plan ${
        formMode === "edit" ? "updates" : "creation"
      } are unavailable until backend integration. No plan was saved.`,
    );
  }

  return (
    <section
      aria-labelledby="plans-title"
      className="mx-auto w-full max-w-7xl"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1
            className="text-2xl font-semibold tracking-tight text-slate-900"
            id="plans-title"
          >
            Subscription Plans
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Configure plan pricing, billing frequency, availability, and
            lifecycle options.
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          onClick={() => {
            setNotice("");
            setSelectedPlan(null);
            setFormMode("add");
          }}
          type="button"
        >
          <Plus aria-hidden="true" size={18} />
          Add plan
        </button>
      </div>
      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <PlanSearch onChange={setSearch} value={search} />
      </div>
      <div className="mt-4">
        <PlanTable
          onEdit={(plan) => {
            setNotice("");
            setSelectedPlan(plan);
            setFormMode("edit");
          }}
          onView={(plan) => navigate("/app/plans/details", { state: plan })}
          plans={filteredPlans}
        />
      </div>
      {formMode && (
        <PlanFormDialog
          notice={notice}
          onClose={() => {
            setFormMode(null);
            setSelectedPlan(null);
            setNotice("");
          }}
          onSubmit={handleSubmit}
          plan={selectedPlan ?? undefined}
          submitLabel={formMode === "add" ? "Save plan" : "Save changes"}
          title={formMode === "add" ? "Add subscription plan" : "Edit plan"}
        />
      )}
    </section>
  );
}
