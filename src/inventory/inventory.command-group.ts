import { createCommandGroupDecorator } from 'necord';

export const DeltaCommand = createCommandGroupDecorator({
  name: 'delta',
  description: 'Manage inventories and stockpiles',
});
