import { useDispatch, useSelector } from "react-redux";
import { fetchReconciliationStatus, selectIsLockedForOperations } from "../../store/checkReconcile";
import VerifierAvatars from "../global/verifierAvatars.jsx/VerifierAvatars";
import VerifyButton from "../verifyButton/VerifyButton";
import CashInDetails from "./CashInDetails";
import { useEffect } from "react";

const ApprovalCell = ({ row, user, activeApproveId, setActiveApproveId, verifyLoading, handleApprovedClick }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (row?.vault_id) {
      dispatch(fetchReconciliationStatus(row.vault_id));
    }
  }, [dispatch, row?.vault_id]);

  useEffect(() => {
    const onFocus = () => {
      if (row?.vault_id) {
        dispatch(fetchReconciliationStatus(row.vault_id));
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [dispatch, row?.vault_id]);
  // 2. Safe Execution: This selector runs ONLY when a valid vault_id exists
  const isLocked = useSelector((state) => selectIsLockedForOperations(state, row.vault_id));

  const isApproverShowButton = row?.required_approvers?.some((approver) => approver?.user_id === user?.id && !approver?.approved);
  const isVerified = row?.verifier_status === "verified";
  const isApproved = row?.approver_status === "approved";

  return (
    <div className="flex flex-col items-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_approvers || []} />

      {isApproverShowButton && isVerified ? (
        <VerifyButton
          handleSubmit={() => handleApprovedClick(row.id)}
          isOpen={activeApproveId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveApproveId(isOpen ? row.id : null)}
          className="max-w-xl"
        >
          <CashInDetails cashIn={row} />
        </VerifyButton>
      ) : (
        isLocked &&
        !isApproved && (
          <div>
            <span className="text-red-500 font-medium text-xs">Cash in is locked</span>
          </div>
        )
      )}

      <span
        className={`capitalize text-xs px-2.5 py-1 rounded-full border ${
          row?.approver_status === "pending" ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-green-50 border-green-200 text-green-500"
        }`}
      >
        {row?.approver_status}
      </span>
    </div>
  );
};

export default ApprovalCell;
