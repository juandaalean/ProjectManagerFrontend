import { createBrowserRouter } from "react-router-dom";
import { AuthLayout } from "../layouts/AuthLayout";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { AppLayout } from "../layouts/AppLayout";
import { ProjectsPage } from "../features/projects/pages/ProjectsPage";

export const router =  createBrowserRouter([
    {
        path: '/login',
        element: (
            <AuthLayout>
                <LoginPage />
            </AuthLayout>
        ),
    },
    {
        path: '/register',
        element: (
            <AuthLayout>
                <RegisterPage />
            </AuthLayout>
        ),
    },
    {
        path: '/',
        element: (
            <AppLayout>
                <ProjectsPage />    
            </AppLayout>
        )
    }
])