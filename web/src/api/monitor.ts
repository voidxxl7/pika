import {get, post, put, del} from './request';
import type {MonitorListResponse, MonitorTask, MonitorTaskRequest, MonitorStats} from '../types';

export const listMonitors = (page: number = 1, pageSize: number = 10, keyword?: string) => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());
    if (keyword) {
        params.append('keyword', keyword);
    }
    return get<MonitorListResponse>(`/admin/monitors?${params.toString()}`);
};

export const createMonitor = (data: MonitorTaskRequest) => {
    return post<MonitorTask>('/admin/monitors', data);
};

export const getMonitor = (id: number) => {
    return get<MonitorTask>(`/admin/monitors/${id}`);
};

export const updateMonitor = (id: number, data: MonitorTaskRequest) => {
    return put<MonitorTask>(`/admin/monitors/${id}`, data);
};

export const deleteMonitor = (id: number) => {
    return del(`/admin/monitors/${id}`);
};

// 公开接口 - 获取所有监控统计数据
export const getAllMonitorStats = () => {
    return get<MonitorStats[]>('/monitors/stats');
};

// 公开接口 - 获取指定监控的统计数据
export const getMonitorStatsByName = (name: string) => {
    return get<MonitorStats[]>(`/monitors/${encodeURIComponent(name)}/stats`);
};

// 聚合的监控历史数据
export interface AggregatedMonitorMetric {
    timestamp: number;
    agentId: string;
    avgResponse: number;
    maxResponse: number;
    minResponse: number;
    successCount: number;
    totalCount: number;
    successRate: number;
    lastStatus: string;
    lastErrorMsg: string;
}

// 公开接口 - 获取指定监控的历史数据
export const getMonitorHistory = (name: string, range: string = '5m') => {
    return get<AggregatedMonitorMetric[]>(`/monitors/${encodeURIComponent(name)}/history?range=${range}`);
};
