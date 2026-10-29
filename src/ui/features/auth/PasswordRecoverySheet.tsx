import { usePasswordRecovery, useSession } from '@/ui/app/session';
import { Sheet } from '@/ui/shared/components/Sheet';
import { NewPasswordForm } from './NewPasswordForm';

/** После входа по ссылке «восстановить пароль» сразу предлагает задать новый. */
export function PasswordRecoverySheet() {
  const { pending, finish } = usePasswordRecovery();
  const session = useSession();
  return (
    <Sheet open={pending} onClose={finish} title="Новый пароль">
      <NewPasswordForm
        email={session?.email ?? null}
        hint="Ты вошёл по ссылке из письма. Придумай пароль, чтобы входить с любого устройства."
        onDone={finish}
      />
    </Sheet>
  );
}
