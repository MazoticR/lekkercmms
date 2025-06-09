import dynamic from 'next/dynamic';
import ProtectedRoute from '../../components/ProtectedRoute';

const OrderCardGenerator = dynamic(
  () => import('../../components/tools/OrderCardGenerator'),
  { ssr: false }
);

const OrderCardsPage = () => {
  return (

      <div className="container mx-auto px-4 py-8">
        <OrderCardGenerator />
      </div>

  );
};

export default OrderCardsPage;