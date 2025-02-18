import axios, { AxiosError, isAxiosError } from 'axios';
import useAuth from './useAuth';
import { useToast } from '@chakra-ui/react';
import { useEffect } from 'react';

export const baseUrl =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

export const instance = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
});

export type ResponseModel<T = undefined> = {
  code: number;
  message: string;
  data: T;
};

export enum Responses {
  SUCCESS = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  NOT_FOUND = 404,
  FORBIDDEN = 403,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  INTERNAL_SERVER_ERROR = 500,
}

const useApi = () => {
  const auth = useAuth();

  useEffect(() => {
    // since we are using jwt in cookies, we can only assume if token is still valid by checkin if certain request is successful
    // if we get 401, we can assume that the token is invalid and try to refresh it
    // if refresh token is invalid, we can assume that the user is not authenticated

    instance.interceptors.response.use(
      (resp) => resp,
      async (error: AxiosError<ResponseModel>) => {
        if (error.response?.status === 401) {
          try {
            await axios.get<
              ResponseModel<{
                email: string;
              }>
            >(baseUrl + "/auth/refresh", {
              withCredentials: true,
            });

            return instance.request(error.config!);

          } catch (e) {
            auth.logout();
          }
        }

        return Promise.reject(error);
      }
    );
  }, [auth]);
  return instance;
};

export const useToastErrorHandler = () => {
  const toast = useToast();

  return (error: AxiosError<ResponseModel>) => {
    if(!isAxiosError(error)) {
      toast({
        title: "Error",
        description: "Something went wrong",
        status: "error",
        isClosable: true,
      })
      return;
    }

    if (error.response) {
      toast({
        title: error.response.data.code
          ? Responses[error.response.data.code]
          : "Error",
        description: error.response.data.message || "Something went wrong",
        status: "error",
        isClosable: true,
      });
      return;
    }
  };
};

export const useFetcher = () => {
  const api = useApi();
  const toastErrorHandler = useToastErrorHandler();

  return (url: string)=> {
    return api
      .get(url, {
        withCredentials: true,
      })
      .then((resp) => resp.data)
      .catch(toastErrorHandler);
  }
}

export default useApi;