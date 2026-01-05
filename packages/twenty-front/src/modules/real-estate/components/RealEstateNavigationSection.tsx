import { NavigationDrawerItem } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerItem';
import { NavigationDrawerSection } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSection';
import { NavigationDrawerSectionTitle } from '@/ui/navigation/navigation-drawer/components/NavigationDrawerSectionTitle';
import { useLingui } from '@lingui/react/macro';
import {
  IconCalendar,
  IconChartBar,
  IconCheck,
  IconCurrencyDollar,
  IconList,
  IconPhone,
  IconSearch,
  IconUsers,
} from 'twenty-ui/display';

export const RealEstateNavigationSection = () => {
  const { t } = useLingui();

  return (
    <NavigationDrawerSection>
      <NavigationDrawerSectionTitle label={t`Real Estate`} />
      <NavigationDrawerItem
        label={t`Dashboard`}
        to="/real-estate/dashboard"
        Icon={IconChartBar}
      />
      <NavigationDrawerItem
        label={t`Projects`}
        to="/real-estate/projects"
        Icon={IconCalendar}
      />
      <NavigationDrawerItem
        label={t`Customers`}
        to="/real-estate/customers/new"
        Icon={IconUsers}
      />
      <NavigationDrawerItem
        label={t`Deals`}
        to="/real-estate/deals"
        Icon={IconCalendar}
      />
      <NavigationDrawerItem
        label={t`Sales Dashboard`}
        to="/real-estate/sales-dashboard"
        Icon={IconChartBar}
      />
      <NavigationDrawerItem
        label={t`Property Search`}
        to="/real-estate/property-filter"
        Icon={IconSearch}
      />
      <NavigationDrawerItem
        label={t`Commissions`}
        to="/real-estate/commissions"
        Icon={IconCurrencyDollar}
      />
      <NavigationDrawerItem
        label={t`Commission Approval`}
        to="/real-estate/commission-approval"
        Icon={IconCheck}
      />
      <NavigationDrawerItem
        label={t`Commission Reports`}
        to="/real-estate/commission-reports"
        Icon={IconList}
      />
      <NavigationDrawerItem
        label={t`Lead Distribution`}
        to="/real-estate/lead-distribution"
        Icon={IconChartBar}
      />
      <NavigationDrawerItem
        label={t`Assignment Rules`}
        to="/real-estate/assignment-rules"
        Icon={IconCheck}
      />
      <NavigationDrawerItem
        label={t`Executive Dashboard`}
        to="/real-estate/executive-dashboard"
        Icon={IconChartBar}
      />
      <NavigationDrawerItem
        label={t`Plot Map`}
        to="/real-estate/plot-map"
        Icon={IconSearch}
      />
      <NavigationDrawerItem
        label={t`My Leads`}
        to="/real-estate/leads"
        Icon={IconPhone}
      />
    </NavigationDrawerSection>
  );
};
