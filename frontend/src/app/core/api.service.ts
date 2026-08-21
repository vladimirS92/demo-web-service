import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  ChatResponse, Finding, Paged, Project, Scan, ScanType, StatsOverview,
} from './models';

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  // ---- Projects ----
  listProjects(search = '') {
    return this.http.get<Paged<Project>>(`${API}/projects`, {
      params: new HttpParams().set('search', search).set('pageSize', 200),
    });
  }
  getProject(id: number) { return this.http.get<Project>(`${API}/projects/${id}`); }
  createProject(data: Partial<Project>) { return this.http.post<Project>(`${API}/projects`, data); }
  updateProject(id: number, data: Partial<Project>) { return this.http.patch<Project>(`${API}/projects/${id}`, data); }
  deleteProject(id: number) { return this.http.delete(`${API}/projects/${id}`); }

  // ---- Scans ----
  startScan(projectId: number, type: ScanType) {
    return this.http.post<Scan>(`${API}/projects/${projectId}/scans`, { type });
  }
  listScans(projectId?: number) {
    let params = new HttpParams();
    if (projectId) params = params.set('projectId', projectId);
    return this.http.get<Scan[]>(`${API}/scans`, { params });
  }
  getScan(id: number) { return this.http.get<Scan>(`${API}/scans/${id}`); }

  // ---- Findings ----
  listFindings(filters: {
    projectId?: number; scanId?: number; severity?: string; status?: string; search?: string;
  } = {}) {
    let params = new HttpParams().set('pageSize', 500);
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Paged<Finding>>(`${API}/findings`, { params });
  }
  getFinding(id: number) { return this.http.get<Finding>(`${API}/findings/${id}`); }
  updateFindingStatus(id: number, status: string, comment: string) {
    return this.http.patch<Finding>(`${API}/findings/${id}/status`, { status, comment });
  }

  // ---- Stats & AI ----
  statsOverview() { return this.http.get<StatsOverview>(`${API}/stats/overview`); }
  chat(messages: { role: 'user' | 'assistant'; content: string }[]) {
    return this.http.post<ChatResponse>(`${API}/ai/chat`, { messages });
  }
}
