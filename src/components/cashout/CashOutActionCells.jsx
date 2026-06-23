import VerifierAvatars from "../global/verifierAvatars.jsx/VerifierAvatars";
import VerifyButton from "../verifyButton/VerifyButton";
import CashOutDetails from "./CashOutDetails";
import CustodianAvatar from "./CustodianAvatar";
import CashOutCustodianModal from "./CashOutCustodianModal";
import { useReconcileLock } from "../../hooks/useReconcileLock";

const LockedNote = () => <span className="text-red-500 font-medium text-xs whitespace-nowrap">Cash out is locked</span>;

// ── Verifiers column ──────────────────────────────────────────────────────────
export const CashOutVerifierCell = ({ row, user, activeVerifyId, setActiveVerifyId, verifyLoading, handleVerify, handleRejectVerify }) => {
  const isLocked = useReconcileLock(row?.vault_id);
  const isVerifierShowButton = row?.required_verifiers?.some((verifier) => verifier?.user_id === user?.id && !verifier?.verified);
  const isVerified = row?.verifier_status === "verified";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  return (
    <div className="flex items-center justify-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_verifiers || []} isRejected={isRejected} />
      {isVerifierShowButton && !isRejected && !isLocked ? (
        <VerifyButton
          handleSubmit={() => handleVerify(row.id)}
          handleReject={(note) => handleRejectVerify(row.id, note)}
          isOpen={activeVerifyId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveVerifyId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Verify"
          rejectTitle="Reject this cash-out?"
        >
          <CashOutDetails cashOut={row} />
        </VerifyButton>
      ) : (
        isLocked && !isVerified && !isRejected && <LockedNote />
      )}
    </div>
  );
};

// ── Custodian column ──────────────────────────────────────────────────────────
export const CashOutCustodianCell = ({ row, user, activeCustodianId, setActiveCustodianId, verifyLoading, handleCustodianVerify, handleCustodianReject }) => {
  const isLocked = useReconcileLock(row?.vault_id);
  const isVerifierShowButton = row?.custodian?.custodian_id === user?.id && row?.custodian?.status === "pending";
  const isVerified = row?.verifier_status === "verified";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  if (!row?.custodian) return <span className="text-gray-300 text-xs">—</span>;

  return (
    <div className="flex items-center justify-center gap-2">
      <CustodianAvatar custodian={row?.custodian || []} />
      {isVerifierShowButton && isVerified && !isRejected && !isLocked ? (
        <VerifyButton
          handleSubmit={() => handleCustodianVerify(row.id)}
          handleReject={(note) => handleCustodianReject(row.id, note)}
          isOpen={activeCustodianId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveCustodianId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Receive"
          rejectTitle="Reject change amount?"
        >
          <CashOutCustodianModal cashOut={row} />
        </VerifyButton>
      ) : (
        isLocked && row?.custodian?.status === "pending" && !isRejected && <LockedNote />
      )}
    </div>
  );
};

// ── Cashiers (approvers) column ───────────────────────────────────────────────
export const CashOutCashierCell = ({ row, user, activeApproveId, setActiveApproveId, verifyLoading, handleApprove, handleRejectApprove }) => {
  const isLocked = useReconcileLock(row?.vault_id);
  const isApproverShowButton = row?.required_approvers?.some((approver) => approver?.user_id === user?.id && !approver?.approved);
  const isVerified = row?.verifier_status === "verified";
  const isApproved = row?.approver_status === "approved";
  const isCustodianConditionMet = !row?.custodian || row?.custodian?.status === "verified";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  return (
    <div className="flex items-center justify-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_approvers || []} isRejected={row?.approver_status === "rejected"} />
      {isApproverShowButton && isVerified && isCustodianConditionMet && !isRejected && !isLocked ? (
        <VerifyButton
          handleSubmit={() => handleApprove(row.id)}
          handleReject={(note) => handleRejectApprove(row.id, note)}
          isOpen={activeApproveId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveApproveId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Approve"
          rejectTitle="Reject this cash-out?"
        >
          <CashOutDetails cashOut={row} />
        </VerifyButton>
      ) : (
        isLocked && !isApproved && !isRejected && <LockedNote />
      )}
    </div>
  );
};
