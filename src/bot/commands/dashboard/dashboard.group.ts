import { createCommandGroupDecorator } from 'necord';

export const DashboardCommand = createCommandGroupDecorator({
  name: 'dashboard',
  description: 'Manage dashboard messages',
});
