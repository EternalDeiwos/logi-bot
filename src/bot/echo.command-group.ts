import { createCommandGroupDecorator } from 'necord';

export const EchoCommand = createCommandGroupDecorator({
  name: 'echo',
  description: 'Manage teams and projects',
});
