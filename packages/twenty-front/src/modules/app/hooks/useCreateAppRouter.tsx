import { AppRouterProviders } from '@/app/components/AppRouterProviders';
import { SettingsRoutes } from '@/app/components/SettingsRoutes';
import { VerifyLoginTokenEffect } from '@/auth/components/VerifyLoginTokenEffect';

import { VerifyEmailEffect } from '@/auth/components/VerifyEmailEffect';
import indexAppPath from '@/navigation/utils/indexAppPath';
import { BlankLayout } from '@/ui/layout/page/components/BlankLayout';
import { DefaultLayout } from '@/ui/layout/page/components/DefaultLayout';
import { AppPath } from 'twenty-shared/types';

import {
    createBrowserRouter,
    createRoutesFromElements,
    Route,
} from 'react-router-dom';
import { Authorize } from '~/pages/auth/Authorize';
import { PasswordReset } from '~/pages/auth/PasswordReset';
import { SignInUp } from '~/pages/auth/SignInUp';
import { NotFound } from '~/pages/not-found/NotFound';
import { RecordIndexPage } from '~/pages/object-record/RecordIndexPage';
import { RecordShowPage } from '~/pages/object-record/RecordShowPage';
import { BookCall } from '~/pages/onboarding/BookCall';
import { BookCallDecision } from '~/pages/onboarding/BookCallDecision';
import { ChooseYourPlan } from '~/pages/onboarding/ChooseYourPlan';
import { CreateProfile } from '~/pages/onboarding/CreateProfile';
import { CreateWorkspace } from '~/pages/onboarding/CreateWorkspace';
import { InviteTeam } from '~/pages/onboarding/InviteTeam';
import { PaymentSuccess } from '~/pages/onboarding/PaymentSuccess';
import { SyncEmails } from '~/pages/onboarding/SyncEmails';
import { AssignmentRulesPage } from '~/pages/real-estate/AssignmentRulesPage';
import { CommissionApprovalPage } from '~/pages/real-estate/CommissionApprovalPage';
import { CommissionReportsPage } from '~/pages/real-estate/CommissionReportsPage';
import { CommissionsPage } from '~/pages/real-estate/CommissionsPage';
import { CustomerFormPage } from '~/pages/real-estate/CustomerFormPage';
import { DashboardPage } from '~/pages/real-estate/DashboardPage';
import { DealDetailPage } from '~/pages/real-estate/DealDetailPage';
import { DealKanbanPage } from '~/pages/real-estate/DealKanbanPage';
import { ExecutiveDashboardPage } from '~/pages/real-estate/ExecutiveDashboardPage';
import { LeadDistributionPage } from '~/pages/real-estate/LeadDistributionPage';
import { MyLeadsPage } from '~/pages/real-estate/MyLeadsPage';
import { PlotMapPage } from '~/pages/real-estate/PlotMapPage';
import { ProjectDetailPage } from '~/pages/real-estate/ProjectDetailPage';
import { ProjectsListPage } from '~/pages/real-estate/ProjectsListPage';
import { PropertyDetailPage } from '~/pages/real-estate/PropertyDetailPage';
import { PropertyFilterPage } from '~/pages/real-estate/PropertyFilterPage';
import { SalesDashboardPage } from '~/pages/real-estate/SalesDashboardPage';

export const useCreateAppRouter = (
  isFunctionSettingsEnabled?: boolean,
  isAdminPageEnabled?: boolean,
) =>
  createBrowserRouter(
    createRoutesFromElements(
      <Route
        element={<AppRouterProviders />}
        // To switch state to `loading` temporarily to enable us
        // to set scroll position before the page is rendered
        loader={async () => Promise.resolve(null)}
      >
        <Route element={<DefaultLayout />}>
          <Route path={AppPath.Verify} element={<VerifyLoginTokenEffect />} />
          <Route path={AppPath.VerifyEmail} element={<VerifyEmailEffect />} />
          <Route path={AppPath.SignInUp} element={<SignInUp />} />
          <Route path={AppPath.Invite} element={<SignInUp />} />
          <Route path={AppPath.ResetPassword} element={<PasswordReset />} />
          <Route path={AppPath.CreateWorkspace} element={<CreateWorkspace />} />
          <Route path={AppPath.CreateProfile} element={<CreateProfile />} />
          <Route path={AppPath.SyncEmails} element={<SyncEmails />} />
          <Route path={AppPath.InviteTeam} element={<InviteTeam />} />
          <Route path={AppPath.PlanRequired} element={<ChooseYourPlan />} />
          <Route
            path={AppPath.PlanRequiredSuccess}
            element={<PaymentSuccess />}
          />
          <Route
            path={AppPath.BookCallDecision}
            element={<BookCallDecision />}
          />
          <Route path={AppPath.BookCall} element={<BookCall />} />
          <Route path={indexAppPath.getIndexAppPath()} element={<></>} />
          <Route path={AppPath.RecordIndexPage} element={<RecordIndexPage />} />
          <Route path={AppPath.RecordShowPage} element={<RecordShowPage />} />
          <Route path="/real-estate/dashboard" element={<DashboardPage />} />
          <Route path="/real-estate/projects" element={<ProjectsListPage />} />
          <Route
            path="/real-estate/projects/:id"
            element={<ProjectDetailPage />}
          />
          <Route
            path="/real-estate/properties/:id"
            element={<PropertyDetailPage />}
          />
          <Route
            path="/real-estate/customers/new"
            element={<CustomerFormPage />}
          />
          <Route
            path="/real-estate/customers/:id"
            element={<CustomerFormPage />}
          />
          <Route path="/real-estate/deals" element={<DealKanbanPage />} />
          <Route path="/real-estate/deals/:id" element={<DealDetailPage />} />
          <Route
            path="/real-estate/sales-dashboard"
            element={<SalesDashboardPage />}
          />
          <Route
            path="/real-estate/property-filter"
            element={<PropertyFilterPage />}
          />
          <Route
            path="/real-estate/commissions"
            element={<CommissionsPage />}
          />
          <Route
            path="/real-estate/commission-approval"
            element={<CommissionApprovalPage />}
          />
          <Route
            path="/real-estate/commission-reports"
            element={<CommissionReportsPage />}
          />
          <Route
            path="/real-estate/lead-distribution"
            element={<LeadDistributionPage />}
          />
          <Route
            path="/real-estate/assignment-rules"
            element={<AssignmentRulesPage />}
          />
          <Route
            path="/real-estate/executive-dashboard"
            element={<ExecutiveDashboardPage />}
          />
          <Route path="/real-estate/plot-map" element={<PlotMapPage />} />
          <Route path="/real-estate/leads" element={<MyLeadsPage />} />
          <Route path="/marketplace" element={<BrowsePage />} />
          <Route path="/marketplace/browse" element={<BrowsePage />} />
          <Route
            path="/marketplace/listings/:id"
            element={<ListingDetailPage />}
          />
          <Route path="/marketplace/register" element={<RegisterPage />} />
          <Route path="/marketplace/login" element={<LoginPage />} />
          <Route path="/marketplace/profile" element={<ProfilePage />} />
          <Route
            path="/marketplace/dashboard"
            element={<MarketplaceDashboardPage />}
          />
          <Route path="/marketplace/post" element={<PostListingPage />} />
          <Route path="/marketplace/inquiries" element={<InquiriesPage />} />
          <Route path="/marketplace/payment" element={<PaymentPage />} />
          <Route
            path={AppPath.SettingsCatchAll}
            element={
              <SettingsRoutes
                isFunctionSettingsEnabled={isFunctionSettingsEnabled}
                isAdminPageEnabled={isAdminPageEnabled}
              />
            }
          />
          <Route path={AppPath.NotFoundWildcard} element={<NotFound />} />
        </Route>
        <Route element={<BlankLayout />}>
          <Route path={AppPath.Authorize} element={<Authorize />} />
        </Route>
      </Route>,
    ),
  );
