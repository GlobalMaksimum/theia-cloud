import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

import {
  LaunchRequest as ClientLaunchRequest,
  PingRequest as ClientPingRequest, RootResourceApi, SessionActivityRequest as ClientSessionActivityRequest, SessionLaunchResponse, SessionListRequest as ClientSessionListRequest,
  SessionResourceApi, SessionSpec, SessionStartRequest as ClientSessionStartRequest, SessionStopRequest as ClientSessionStopRequest,
  UserWorkspace, WorkspaceCreationRequest as ClientWorkspaceCreationRequest, WorkspaceCreationResponse,
  WorkspaceDeletionRequest as ClientWorkspaceDeletionRequest, WorkspaceListRequest as ClientWorkspaceListRequest,
  WorkspaceResourceApi
} from './client/api';
import { Configuration } from './client/configuration';

const DEFAULT_TIMEOUT = 30000;

export interface ServiceRequest {
  serviceUrl: string;
  kind?: string;
}

export type PingRequest = ClientPingRequest & ServiceRequest;
export namespace PingRequest {
  export const KIND = 'pingRequest';

  export function create(serviceUrl: string, appId: string): PingRequest {
    return { serviceUrl, appId };
  }
}

export type LaunchRequest = ClientLaunchRequest & ServiceRequest;
export namespace LaunchRequest {
  export const KIND = 'launchRequest';

  export function ephemeral(serviceUrl: string, appId: string, appDefinition: string, timeout?: number, user: string = createUser()): LaunchRequest {
    return { serviceUrl, appId, appDefinition, user, ephemeral: true, timeout };
  }

  export function createWorkspace(serviceUrl: string, appId: string, appDefinition: string, timeout?: number, user: string = createUser(),
    workspaceName?: string, label?: string): LaunchRequest {
    return { serviceUrl, appId, appDefinition, user, label, workspaceName, ephemeral: false, timeout };
  }

  // eslint-disable-next-line max-len
  export function existingWorkspace(serviceUrl: string, appId: string, workspaceName: string, timeout?: number, appDefinition?: string, user: string = createUser()): LaunchRequest {
    return { serviceUrl, appId, workspaceName, appDefinition, user, timeout };
  }
}

export type SessionListRequest = ClientSessionListRequest & ServiceRequest;
export namespace SessionListRequest {
  export const KIND = 'sessionListRequest';
}

export type SessionStartRequest = ClientSessionStartRequest & ServiceRequest;
export namespace SessionStartRequest {
  export const KIND = 'sessionStartRequest';
}

export type SessionStopRequest = ClientSessionStopRequest & ServiceRequest;
export namespace SessionStopRequest {
  export const KIND = 'sessionStopRequest';
}

export type SessionActivityRequest = ClientSessionActivityRequest & ServiceRequest;
export namespace SessionActivityRequest {
  export const KIND = 'sessionActivityRequest';
}

export type WorkspaceListRequest = ClientWorkspaceListRequest & ServiceRequest;
export namespace WorkspaceListRequest {
  export const KIND = 'workspaceListRequest';
}

export type WorkspaceCreationRequest = ClientWorkspaceCreationRequest & ServiceRequest;
export namespace WorkspaceCreationRequest {
  export const KIND = 'workspaceCreationRequest';
}

export type WorkspaceDeletionRequest = ClientWorkspaceDeletionRequest & ServiceRequest;
export namespace WorkspaceDeletionRequest {
  export const KIND = 'workspaceDeletionRequest';
}

export namespace TheiaCloud {
  function basePath(url: string): string {
    // remove any path names as they are provided by the APIs
    const pathName = new URL(url).pathname;
    return url.endsWith(pathName) ? url.substring(0, url.length - new URL(url).pathname.length) : url;
  }

  function rootApi(url: string): RootResourceApi {
    return new RootResourceApi(new Configuration({ basePath: basePath(url) }));
  }

  function sessionApi(url: string): SessionResourceApi {
    return new SessionResourceApi(new Configuration({ basePath: basePath(url) }));
  }

  function workspaceApi(url: string): WorkspaceResourceApi {
    return new WorkspaceResourceApi(new Configuration({ basePath: basePath(url) }));
  }

  export async function ping(request: PingRequest): Promise<boolean> {
    try {
      return getData(() => rootApi(request.serviceUrl).serviceAppIdGet(request.appId, createConfig()));
    } catch (error) {
      console.error((error as any).message);
      throw error;
    }
  }

  export async function launch(request: LaunchRequest, retries = 0, timeout?: number): Promise<void> {
    const launchRequest = { kind: LaunchRequest.KIND, ...request };
    try {
      const response = await getData(() => rootApi(request.serviceUrl).servicePost(launchRequest, createConfig(timeout)));
      const sessionLaunch = response;
      if (sessionLaunch.success) {
        console.log(`Redirect to: https://${sessionLaunch.url}`);
        location.replace(`https://${sessionLaunch.url}`);
      } else {
        console.error(sessionLaunch.error);
        throw new Error(`Could not launch session: ${sessionLaunch.error}`);
      }
    } catch (error) {
      // Request timed out or returned an error with an error HTTP code.
      console.error((error as any).message);
      if (retries > 0) {
        launch(request, retries - 1, timeout);
      } else {
        throw error;
      }
    }
  }

  export namespace Session {
    export async function listSessions(request: SessionListRequest, timeout?: number): Promise<SessionSpec[]> {
      return getData(() => sessionApi(request.serviceUrl).serviceSessionAppIdUserGet(request.appId, request.user, createConfig(timeout)));
    }

    export async function startSession(request: SessionStartRequest, timeout?: number): Promise<SessionLaunchResponse> {
      const sessionStartRequest = { kind: SessionStartRequest.KIND, ...request };
      return getData(() => sessionApi(request.serviceUrl).serviceSessionPost(sessionStartRequest, createConfig(timeout)));
    }

    export async function stopSession(request: SessionStopRequest, timeout?: number): Promise<boolean> {
      const sessionStopRequest = { kind: SessionStopRequest.KIND, ...request };
      return getData(() => sessionApi(request.serviceUrl).serviceSessionDelete(sessionStopRequest, createConfig(timeout)));
    }

    export async function reportSessionActivity(request: SessionActivityRequest, timeout?: number): Promise<boolean> {
      const sessionActivityRequest = { kind: SessionActivityRequest.KIND, ...request };
      return getData(() => sessionApi(request.serviceUrl).serviceSessionPatch(sessionActivityRequest, createConfig(timeout)));
    }
  }

  export namespace Workspace {
    export async function listWorkspaces(request: WorkspaceListRequest, timeout?: number): Promise<UserWorkspace[]> {
      return getData(() => workspaceApi(request.serviceUrl).serviceWorkspaceAppIdUserGet(request.appId, request.user, createConfig(timeout)));
    }

    export async function createWorkspace(request: WorkspaceCreationRequest, timeout?: number): Promise<WorkspaceCreationResponse> {
      const workspaceCreationRequest = { kind: WorkspaceCreationRequest.KIND, ...request };
      return getData(() => workspaceApi(request.serviceUrl).serviceWorkspacePost(workspaceCreationRequest, createConfig(timeout)));
    }

    export async function deleteWorkspace(request: WorkspaceDeletionRequest, timeout?: number): Promise<boolean> {
      const workspaceDeletionRequest = { kind: WorkspaceDeletionRequest.KIND, ...request };
      return getData(() => workspaceApi(request.serviceUrl).serviceWorkspaceDelete(workspaceDeletionRequest, createConfig(timeout)));
    }
  }
}

function createUser(): string {
  return uuidv4() + '@theia.cloud';
}

function createConfig(timeout = DEFAULT_TIMEOUT): AxiosRequestConfig {
  return { timeout };
}

async function getData<T = any>(call: () => Promise<AxiosResponse<T>>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error) {
    console.error((error as any).message);
    throw error;
  }
}