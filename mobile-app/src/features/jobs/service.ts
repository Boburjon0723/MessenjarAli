import { apiFetch } from "../../lib/api";
import { API_URL } from "../../lib/config";

export interface JobCategory {
  id: number;
  name_uz: string;
  name_ru: string;
  icon?: string;
  publication_price_mali: string;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  salary_min?: string;
  salary_max?: string;
  category_id: number;
  category_name_uz: string;
  category_name_ru: string;
  location?: string;
  created_at: string;
  short_text?: string;
  company_name?: string;
  work_type?: string;
}

export async function getJobsRequest(): Promise<Job[]> {
  const response = await apiFetch("/api/jobs");
  if (!response.ok) throw new Error("Ishlarni yuklab bo'lmadi");
  return response.json();
}

export async function getCategoriesRequest(): Promise<JobCategory[]> {
  const response = await apiFetch("/api/jobs/categories");
  if (!response.ok) throw new Error("Kategoriyalarni yuklab bo'lmadi");
  return response.json();
}

export async function createJobRequest(jobData: any): Promise<Job> {
  const response = await apiFetch("/api/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  });
  if (!response.ok) throw new Error("Ish e'loni yaratilmadi");
  return response.json();
}
