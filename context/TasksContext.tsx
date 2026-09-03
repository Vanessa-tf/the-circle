import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { SkillCategory } from "../constants/scoring";

export type TaskStatus = "open" | "closed";
export type SubmissionStatus = "pending" | "approved" | "rejected";

export type Task = {
  id: string;
  org_id: string;
  title: string;
  description: string;
  skill_category: SkillCategory;
  points: number;
  deadline: string | null;
  status: TaskStatus;
  created_at: string;
};

export type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  evidence: string;
  status: SubmissionStatus;
  created_at: string;
  resolved_at: string | null;
};

export type NewTaskInput = {
  title: string;
  description: string;
  skill_category: SkillCategory;
  points: number;
  deadline: string | null;
};

type IncomingSubmission = Submission & { submitter_name: string | null; task_title: string };
type MySubmission = Submission & { task_title: string };

type TasksContextValue = {
  tasks: Task[];
  myTasks: Task[];
  mySubmissions: MySubmission[];
  incomingSubmissions: IncomingSubmission[];
  loading: boolean;
  refresh: () => Promise<void>;
  createTask: (input: NewTaskInput) => Promise<Task>;
  closeTask: (taskId: string) => Promise<void>;
  submitWork: (taskId: string, evidence: string) => Promise<void>;
  resolveSubmission: (submissionId: string, approve: boolean) => Promise<void>;
  undoSubmissionResolution: (submissionId: string) => Promise<void>;
};

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

const TASK_COLUMNS = "id, org_id, title, description, skill_category, points, deadline, status, created_at";
const SUBMISSION_COLUMNS = "id, task_id, user_id, evidence, status, created_at, resolved_at";

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { session, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [incomingSubmissions, setIncomingSubmissions] = useState<IncomingSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const isOrg = profile?.account_type === "Company" || profile?.account_type === "Institution";

  const fetchAll = useCallback(async () => {
    if (!session || !profile) {
      setTasks([]);
      setMyTasks([]);
      setMySubmissions([]);
      setIncomingSubmissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (isOrg) {
      const { data: myTasksData, error: myTasksError } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .eq("org_id", session.user.id)
        .order("created_at", { ascending: false });

      if (myTasksError) {
        console.warn("Failed to fetch tasks:", myTasksError.message);
        setMyTasks([]);
        setIncomingSubmissions([]);
      } else {
        const taskRows = (myTasksData ?? []) as Task[];
        setMyTasks(taskRows);

        const taskIds = taskRows.map((t) => t.id);
        if (taskIds.length === 0) {
          setIncomingSubmissions([]);
        } else {
          const { data: subs, error: subsError } = await supabase
            .from("task_submissions")
            .select(SUBMISSION_COLUMNS)
            .in("task_id", taskIds)
            .order("created_at", { ascending: false });

          if (subsError || !subs) {
            console.warn("Failed to fetch submissions:", subsError?.message);
            setIncomingSubmissions([]);
          } else {
            const userIds = [...new Set(subs.map((s) => s.user_id))];
            const { data: submitters } = await supabase
              .from("profiles")
              .select("id, full_name")
              .in("id", userIds.length > 0 ? userIds : [""]);

            const nameById = new Map((submitters ?? []).map((p) => [p.id, p.full_name]));
            const titleById = new Map(taskRows.map((t) => [t.id, t.title]));

            setIncomingSubmissions(
              (subs as Submission[]).map((s) => ({
                ...s,
                submitter_name: nameById.get(s.user_id) ?? null,
                task_title: titleById.get(s.task_id) ?? "",
              }))
            );
          }
        }
      }
      setTasks([]);
      setMySubmissions([]);
    } else {
      const [openTasksRes, mySubsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(TASK_COLUMNS)
          .eq("status", "open")
          .order("created_at", { ascending: false }),
        supabase
          .from("task_submissions")
          .select(SUBMISSION_COLUMNS)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (openTasksRes.error) {
        console.warn("Failed to fetch open tasks:", openTasksRes.error.message);
        setTasks([]);
      } else {
        setTasks((openTasksRes.data ?? []) as Task[]);
      }

      if (mySubsRes.error || !mySubsRes.data) {
        console.warn("Failed to fetch submissions:", mySubsRes.error?.message);
        setMySubmissions([]);
      } else {
        const taskIds = [...new Set(mySubsRes.data.map((s) => s.task_id))];
        const { data: subTasks } = await supabase
          .from("tasks")
          .select("id, title")
          .in("id", taskIds.length > 0 ? taskIds : [""]);
        const titleById = new Map((subTasks ?? []).map((t) => [t.id, t.title]));

        setMySubmissions(
          (mySubsRes.data as Submission[]).map((s) => ({
            ...s,
            task_title: titleById.get(s.task_id) ?? "",
          }))
        );
      }
      setMyTasks([]);
      setIncomingSubmissions([]);
    }

    setLoading(false);
  }, [session, profile, isOrg]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createTask = useCallback(
    async (input: NewTaskInput) => {
      if (!session) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...input, org_id: session.user.id })
        .select(TASK_COLUMNS)
        .single();
      if (error) throw error;
      await fetchAll();
      return data as Task;
    },
    [session, fetchAll]
  );

  const closeTask = useCallback(
    async (taskId: string) => {
      const { error } = await supabase.from("tasks").update({ status: "closed" }).eq("id", taskId);
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  const submitWork = useCallback(
    async (taskId: string, evidence: string) => {
      if (!session) throw new Error("Not signed in");
      const { error } = await supabase
        .from("task_submissions")
        .insert({ task_id: taskId, user_id: session.user.id, evidence });
      if (error) throw error;
      await fetchAll();
    },
    [session, fetchAll]
  );

  const resolveSubmission = useCallback(
    async (submissionId: string, approve: boolean) => {
      const { error } = await supabase.rpc("resolve_task_submission", {
        p_submission_id: submissionId,
        p_approve: approve,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  const undoSubmissionResolution = useCallback(
    async (submissionId: string) => {
      const { error } = await supabase.rpc("undo_task_submission_resolution", {
        p_submission_id: submissionId,
      });
      if (error) throw error;
      await fetchAll();
    },
    [fetchAll]
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        myTasks,
        mySubmissions,
        incomingSubmissions,
        loading,
        refresh: fetchAll,
        createTask,
        closeTask,
        submitWork,
        resolveSubmission,
        undoSubmissionResolution,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within a TasksProvider");
  return ctx;
}
