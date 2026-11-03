import { Component, lazy, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import StoreLayout from '@/components/store/StoreLayout';
import Home from '@/pages/Home';
import Shop from '@/pages/Shop';
import ProductPage from '@/pages/ProductPage';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import NotFound from '@/pages/NotFound';
import { FullPageSpinner } from '@/components/Spinner';

// The admin dashboard is code-split so visitors never download it.
const AdminLayout = lazy(() => import('@/admin/AdminLayout'));
const Login = lazy(() => import('@/admin/Login'));
const Overview = lazy(() => import('@/admin/Overview'));
const Products = lazy(() => import('@/admin/Products'));
const ProductForm = lazy(() => import('@/admin/ProductForm'));
const MediaLibrary = lazy(() => import('@/admin/MediaLibrary'));
const SiteEditor = lazy(() => import('@/admin/editor/SiteEditor'));
const Settings = lazy(() => import('@/admin/Settings'));
const GitHubPage = lazy(() => import('@/admin/GitHubPage'));
const AdminNotFound = lazy(() => import('@/admin/AdminNotFound'));

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-sm text-stone-600">{this.state.error.message}</p>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white" onClick={() => window.location.reload()}>
          Reload the page
        </button>
      </div>
    );
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<FullPageSpinner />}>
        <Routes>
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<ProductPage />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="admin/login" element={<Login />} />
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="editor" element={<SiteEditor />} />
            <Route path="media" element={<MediaLibrary />} />
            <Route path="settings" element={<Settings />} />
            <Route path="github" element={<GitHubPage />} />
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
