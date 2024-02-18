import { StringOption } from 'necord';

export class CreateDashboardCommandParams {
  @StringOption({
    name: 'text',
    description: 'Test description',
    required: true,
  })
  text: string;
}
