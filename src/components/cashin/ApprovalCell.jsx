import VerifierAvatars from "../global/verifierAvatars.jsx/VerifierAvatars";
import VerifyButton from "../verifyButton/VerifyButton";
import CashInDetails from "./CashInDetails";

const ApprovalCell = ({ row, user, activeApproveId, setActiveApproveId, verifyLoading, handleApprovedClick, handleRejectClick }) => {
  const isLocked = row?.is_reconciliation_locked === true;

  const isApproverShowButton = row?.required_approvers?.some((approver) => approver?.user_id === user?.id && !approver?.approved);
  const isVerified = row?.verifier_status === "verified";
  const isApproved = row?.approver_status === "approved";
  const isRejected = row?.verifier_status === "rejected" || row?.approver_status === "rejected";

  return (
    <div className="flex items-center justify-center gap-2">
      <VerifierAvatars requiredVerifiers={row.required_approvers || []} isRejected={isRejected} />
      {isApproverShowButton && isVerified && !isRejected && !isLocked ? (
        <VerifyButton
          handleSubmit={() => handleApprovedClick(row.id)}
          handleReject={handleRejectClick}
          isOpen={activeApproveId === row.id}
          isLoading={verifyLoading}
          setOpen={(isOpen) => setActiveApproveId(isOpen ? row.id : null)}
          className="max-w-xl"
          title="Approve"
          rejectTitle="Reject this cash-in?"
        >
          <CashInDetails cashInId={row.id} />
        </VerifyButton>
      ) : (
        isLocked && !isApproved && (
          <span className="text-red-500 font-medium text-xs whitespace-nowrap">Cash in is locked</span>
        )
      )}
    </div>
  );
};

export default ApprovalCell;
