import { Link } from 'react-router-dom';
import { AdminEmpty, Btn } from './ui';

export default function AdminNotFound() {
  return (
    <AdminEmpty
      title="This admin page does not exist"
      text="Use the sidebar to pick a section."
      action={
        <Link to="/admin">
          <Btn variant="primary">Back to dashboard</Btn>
        </Link>
      }
    />
  );
}
