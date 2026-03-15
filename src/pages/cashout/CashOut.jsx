import { useEffect, useState } from "react";
import DataTable from "../../components/global/dataTable/DataTable";
import { motion, AnimatePresence } from "framer-motion";
import VerifierAvatars from "../../components/global/verifierAvatars.jsx/VerifierAvatars";

import dayjs from "dayjs";
import { CheckCircle, ChevronDown, Hash, Package } from "lucide-react";
import { GetVaultBagById, GetVaults } from "../../services/Vault";
import { useSearchParams } from "react-router-dom";
import CashOutConfirmationModal from "../../components/cashout/CashOutConfirmationModal";
import { GetCashOuts } from "../../services/Cash";
import { useSelector } from "react-redux";
import { selectIsLockedForOperations } from "../../store/checkReconcile";

const CashOut = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const step = parseInt(searchParams.get("step") || "0");
  const [isCashOut, setIsCashOut] = useState(step >= 1);
  const [vaults, setVaults] = useState([]);
  const [selectedVaultId, setSelectedVaultId] = useState(null);
  const [bags, setBags] = useState([]);
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [suggestedBags, setSuggestedBags] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [cashOuts, setCashOuts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bestMatchAmount, setBestMatchAmount] = useState();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedBags, setSelectedBags] = useState([]);
  const [selectedBagsTotalAmount, setSelectedBagsTotalAmount] = useState(0);
  const isLocked = useSelector(selectIsLockedForOperations);

  useEffect(() => {
    // Fetch vaults
    GetVaults().then((res) => setVaults(res.data || []));
  }, []);

  // Sync URL step
  useEffect(() => {
    setSearchParams({ step: step.toString() });
    setIsCashOut(step >= 1);
  }, [step]);

  const fetchCashOutLits = async () => {
    const res = await GetCashOuts();
    setCashOuts(res?.data?.data || []);
  };

  useEffect(() => {
    fetchCashOutLits();
  }, []);



  const fetchVaultBagsByVaultId = async () => {
    if (selectedVaultId) {
      const res = await GetVaultBagById(selectedVaultId, "");
      setBags(res?.data || []);
    }
  };

  const handleClearBestMatch = () => {
    fetchVaultBagsByVaultId();

    setBestMatchAmount("");
    setSuggestedBags([]);
    setSelectedRows([]);
  };

  useEffect(() => {
    fetchVaultBagsByVaultId();
  }, [selectedVaultId]);


  const handleVaultSelect = (vaultId) => {
    setSelectedVaultId(vaultId);
    setDropdownOpen(false);
  };

  const bestMatch = async () => {
    const amount = parseFloat(bestMatchAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (!selectedVaultId) {
      alert("Please select a vault first");
      return;
    }

    const queryString = `amount=${amount}`;

    try {
      // Use your existing service or direct fetch
      const res = await GetVaultBagById(selectedVaultId, queryString);
      // Assuming your service supports params
      if (res.success) {
        const { matched_bags = [], total_matched = 0 } = res.data;

        setBags(res?.data);

        setSuggestedBags(matched_bags);
        setSelectedRows(matched_bags); // Auto-select in table

        // if (matched_bags.length === 0) {
        //   alert("No bags can match this amount");
        // } else {
        //   alert(`Best match: ${matched_bags.length} bag(s) = ${total_matched}`);
        // }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to find best match");
    }
  };

  const suggestBags = (amount) => {
    // Simple greedy suggestion: sort bags descending, pick until >= amount
    const sortedBags = [...bags].sort((a, b) => b.current_amount - a.current_amount);
    let sum = 0;
    const selected = [];
    for (let bag of sortedBags) {
      if (sum + bag.current_amount <= amount * 1.05) {
        // Allow 5% over
        selected.push(bag);
        sum += bag.current_amount;
        if (sum >= amount) break;
      }
    }
    setSuggestedBags(selected);
  };

  const handleBack = () => {
    if (step > 1) {
      setSearchParams({ step: step - 1 });
    } else if (step === 1) {
      setSearchParams({ step: step - 1 });
    } else {
      localStorage.removeItem("cashInWizard");
      setSelectedRows([]);
      // setAmounts({});
      // setTransactionId(null);
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedRows.length === 0) {
      alert("Please select at least one order");
      return;
    }
    // if (step === 2) {
    //   const hasAmount = selectedRows.some((row) => parseFloat(amounts[row.id]) > 0);
    //   if (!hasAmount) {
    //     alert("Please enter amount for at least one order");
    //     return;
    //   }
    // }
    setSearchParams({ step: step + 1 });
  };

  const handleCashOutSubmit = async () => {
    if (!cashOutAmount || suggestedBags.length === 0) return alert("Invalid request");

    const payload = {
      vault_id: selectedVaultId,
      bags: suggestedBags.map((bag) => bag.id),
      amount: cashOutAmount,
      note: "Cash out request",
    };

    try {
      await CreateCashOutRequest(payload);
      alert("Cash out requested - awaiting approval");
      setCashOutAmount("");
      setSuggestedBags([]);
    } catch (err) {
      alert("Failed to request cash out");
    }
  };

  const handleFinish = () => {
    // if (Math.abs(totalDenominationAmount - totalEnteredAmount) > 0.01) {
    //   alert(`Denomination total (৳${totalDenominationAmount}) must match entered amount (৳${totalEnteredAmount})`);
    //   return;
    // }
    setShowConfirmModal(true);
  };

  useEffect(() => {
    if (selectedRows.length > 0) {
      const total = selectedRows?.reduce((total, bag) => total + bag.current_amount, 0);
      setSelectedBagsTotalAmount(total);
    }
  }, [selectedRows]);

  const removeSelectedBag = (barcode) => {
    setSelectedRows(selectedRows.filter((bag) => bag.barcode !== barcode));
  };

  const confirmCashOut = async () => {
    setShowConfirmModal(true);
  };

  const refetch = () => {
    fetchCashOutLits();
  };


  const columnsCashOutLists = [
    {
      title: "Transaction ID",
      key: "tran_id",
      className: "w-32",
      render: (row) => <span className="">{row?.tran_id}</span>,
    },
    {
      title: "Vault",
      key: "vault_id",
      className: "w-24",
      render: (row) => <span className="">{row?.vault?.vault_id}</span>,
    },
    {
      title: "Bag",
      key: "customer.name",
      className: "w-50", // Adjust width as needed
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2 -ml-1 -mt-1">
          {/* Main horizontal flex container */}
          {row?.cash_out_bags?.length > 0 ? (
            row.cash_out_bags.map((bag, i) => (
              <span key={i} className="inline-flex items-center px-3 py-1.5 bg-cyan-50 border border-cyan-200 text-xs font-medium rounded-full">
                {bag?.bag?.barcode} - RN#{bag?.bag?.rack_number}
              </span>
            ))
          ) : (
            <span className="text-gray-400 text-xs">No bags</span>
          )}
        </div>
      ),
    },
    {
      title: "Amount",
      key: "current_amount",
      className: "w-20",
      render: (row) => <span className="">{row?.cash_out_amount}</span>,
    },

    {
      title: "Requested at",
      key: "created_at",
      className: "w-34",
      render: (row) => <span className="">{dayjs(row.created_at).format("DD MMM, YYYY")}</span>,
    },
    {
      title: "Vault Verifier",
      key: "required_verifiers",
      className: "w-40",
      render: (row) => {
        const requiredVerifiers = row.required_verifiers || [];

        return <VerifierAvatars requiredVerifiers={requiredVerifiers} />;
      },
    },
    {
      title: "Verifier Approver",
      key: "required_verifiers",
      className: "w-40",
      render: (row) => {
        const requiredApprovers = row.required_approvers || [];

        return <VerifierAvatars requiredVerifiers={requiredApprovers} />;
      },
    },
    {
      title: "Verifiers",
      key: "created_at",
      className: "w-20",
      render: (row) => (
        <span
          className={`capitalize text-xs ${
            row?.verifier_status === "pending" ? "bg-yellow-50 border border-yellow-200 text-yellow-600" : "bg-green-50 border border-green-200 text-green-500"
          } px-2.5 py-1  rounded-full`}
        >
          {row?.verifier_status}
        </span>
      ),
    },
    {
      title: "Approvers",
      key: "created_at",
      className: "w-32",
      render: (row) => (
        <span
          className={`capitalize text-xs ${
            row?.status === "pending" ? "bg-yellow-50 border border-yellow-200 text-yellow-600" : "bg-green-50 border border-green-200 text-green-500"
          } px-2.5 py-1  rounded-full`}
        >
          {row?.status}
        </span>
      ),
    },
    {
      title: "Action",
      key: "actions",
      className: "w-24 ",
      render: (row) => {
        const handleEdit = (e) => {
          e.stopPropagation();
          // Your edit logic here
          // e.g., open edit modal with row data
          // setEditData(row);
          // setIsEditModalOpen(true);
        };

        const handleDelete = (e) => {
          e.stopPropagation();
          // Your delete logic here
          // e.g., show confirm dialog then call API
          if (window.confirm(`Delete vault "${row.name}"?`)) {
            // DeleteVault(row.id).then(() => fetchVaultData());
          }
        };

        return (
          <div className="flex items-center justify-center gap-3 py-2">
            {/* Edit Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleEdit}
              className="p-2 rounded-lg bg-blue-500/10 cursor-pointer hover:bg-blue-500/20 text-blue-600 border border-blue-400/20 transition-all "
              aria-label="Edit vault"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </motion.button>

            {/* Delete Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className="p-2 rounded-lg bg-red-500/10 cursor-pointer hover:bg-red-500/20 text-red-600 border border-red-400/20 transition-all "
              aria-label="Delete vault"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </motion.button>
          </div>
        );
      },
    },
  ];
  const columns = [
    {
      title: "Bag",
      key: "customer.name",
      className: "w-32",
      render: (row) => <span className="">{row?.barcode}</span>,
    },
    {
      title: "Rack",
      key: "customer.name",
      className: "w-32",
      render: (row) => <span className="">{row?.rack_number}</span>,
    },
    {
      title: "Amount (৳)",
      key: "current_amount",
      className: "w-20",
      render: (row) => <span className="">{row?.current_amount}</span>,
    },
    {
      title: "Select",
      key: "selection",
      className: "w-40",
      render: (row) => {
        const isSelected = selectedRows.some((selected) => selected.id === row.id);
  
        const toggleSelection = (e) => {
          e.stopPropagation();
          setSelectedRows((prev) => {
            const exists = prev.some((item) => item.id === row.id);
            if (exists) {
              return prev.filter((item) => item.id !== row.id);
            } else {
              return [...prev, row];
            }
          });
        };

        return (
          <div className="flex items-center justify-start ">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleSelection}
              className={`
                relative w-7 h-7 ${row?.current_amount > 0 ? "flex" : "hidden"} rounded-full flex items-center justify-center border  overflow-hidden
                transition-all duration-300 ease-out
                ${isSelected ? "bg-cyan-50 border-cyan-500" : "bg-transparent border border-gray-200 hover:border-sky-500 hover:shadow-md"}
              `}
              aria-label={isSelected ? "Deselect row" : "Select row"}
            >
              <motion.div
                className="absolute inset-0 bg-cyan-500/20"
                initial={false}
                animate={{ scale: isSelected ? 1 : 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
              <motion.svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 relative z-10 pointer-events-none" initial={false}>
                <motion.path
                  d="M4 12L9 17L20 6"
                  stroke="blue"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{
                    pathLength: isSelected ? 1 : 0,
                    opacity: isSelected ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.35,
                    ease: "easeOut",
                    opacity: { duration: 0.15 },
                    pathLength: { delay: isSelected ? 0.1 : 0 },
                  }}
                />
              </motion.svg>
              <motion.div
                className="absolute inset-0 rounded-xl"
                whileTap={{
                  background: "radial-gradient(circle, rgba(255,255,255,0.3) 10%, transparent 70%)",
                }}
              />
            </motion.button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-4">
      <div className="flex items-center  justify-between p-2">
        <h1 className="text-lg font-semibold text-gray-600">
          {step === 0 && "Cash Out Lists"}
          {step === 1 && "Cash Out Request"}
          {step === 2 && "Requested Bag Details"}
        </h1>
        <div className="flex items-center gap-4">
          {step === 1 && (
            <div
              onClick={handleBack}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-gray-50 backdrop-blur-xl rounded-lg overflow-hidden hover:text-black bg-transparent text-zinc-500 border border-zinc-100"
            >
              <p>Back</p>
            </div>
          )}

          {step === 0 && (
            <div
              onClick={handleNext}
              className={`cursor-pointer ${isLocked ? "hidden" : ""} transition-all duration-300 ease-in-out px-4 py-1 hover:bg-cyan-100 backdrop-blur-xl rounded-lg overflow-hidden hover:text-cyan-600 bg-cyan-50 text-cyan-500 border border-cyan-300`}
            >
              <p>Cash Out</p>
            </div>
          )}
          {step > 1 && (
            <div
              onClick={handleBack}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-gray-100 backdrop-blur-xl rounded-lg overflow-hidden  bg-transparent text-zinc-300 border hover:text-zinc-500 border-zinc-200"
            >
              <p>Back</p>
            </div>
          )}

          {step === 1 && selectedRows.length > 0 && (
            <div
              onClick={handleNext}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-white/10 backdrop-blur-xl rounded-lg overflow-hidden hover:text-cyan-600 bg-cyan-50 text-cyan-300 border border-cyan-300"
            >
              <p>Next</p>
            </div>
          )}

          {step === 2 && (
            <div
              onClick={handleFinish}
              className="cursor-pointer transition-all duration-300 ease-in-out px-4 py-1 hover:bg-cyan-500 backdrop-blur-xl rounded-lg overflow-hidden text-cyan-300 bg-cyan-50 border border-cyan-500/50 font-semibold"
            >
              <p>Finish</p>
            </div>
          )}

        </div>
      </div>
      {step === 1 && (
        <div className="flex items-center justify-between">
          <div className="mb-6 text-gray-600">
            <p className="text-xs font-semibold mb-2">Select Vault</p>
            <motion.div className="relative " initial={false} animate={{ height: dropdownOpen ? "auto" : "fit-content" }}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="min-w-50 px-4 py-1 text-xs bg-white border border-gray-300 rounded-md flex justify-between items-center text-gray-700"
              >
                {selectedVaultId ? vaults.find((v) => v.id === selectedVaultId)?.name : "Choose Vault"}
                <ChevronDown className={`w-5 h-5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-10 bg-white border border-gray-300 rounded-md mt-1 text-xs min-w-50 max-h-60 overflow-y-auto"
                  >
                    {vaults.map((vault) => (
                      <li key={vault.id} onClick={() => handleVaultSelect(vault.id)} className="px-4 py-2 hover:bg-cyan-50 cursor-pointer">
                        {vault.name} ({vault.vault_id})
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          {bags.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={bestMatchAmount}
                  placeholder="Enter Amount"
                  onChange={(e) => setBestMatchAmount(e.target.value)}
                  className="px-4 py-1 border border-gray-200 rounded-lg  text-gray-600 placeholder-gray-400 placeholder:text-xs focus:outline-none focus:border-cyan-400 transition w-full sm:w-40"
                />
                <div onClick={bestMatch} className="bg-cyan-400 hover:bg-white border border-cyan-200 text-black px-4 py-2 cursor-pointer rounded-lg text-xs">
                  Best Match
                </div>
                {bestMatchAmount && (
                  <p onClick={handleClearBestMatch} className="text-xs hover:text-red-400 cursor-pointer">
                    Clear
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === 0 && <DataTable columns={columnsCashOutLists} data={cashOuts} className="h-[calc(100vh-100px)]" />}
      {step === 1 && <DataTable columns={columns} data={bags} className="h-[calc(100vh-300px)]" />}

      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed inset-x-4 top-20 left-1/2 -translate-x-1/2 max-w-2xl mx-auto z-50"
        >
          <div className="bg-white rounded-2xl  border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-white" />
                <h3 className="text-lg font-bold text-white">Selected Bags ({selectedRows?.length})</h3>
              </div>
            </div>

            {/* Bags List */}
            <div className="max-h-96 overflow-y-auto">
              {selectedRows?.map((bag, index) => (
                <motion.div
                  key={bag.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-6 py-4 border-b border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="bg-cyan-100 rounded-xl p-3">
                          <Package className="w-8 h-8 text-cyan-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-gray-500" />
                            <p className="font-semibold text-gray-900">{bag.barcode}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                            <span className="font-medium">Rack:</span>
                            <span>{bag.rack_number || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">৳{bag.current_amount?.toLocaleString() || 0}</p>
                      {
                        <button
                          onClick={() => removeSelectedBag(bag.barcode)}
                          className="text-xs cursor-pointer text-red-500 hover:text-red-700 mt-1 underline"
                        >
                          Remove
                        </button>
                      }
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer - Total & Confirm */}
            <div className="bg-gray-50 px-6 py-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-sm text-gray-600">Total Selected Amount</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-2xl font-bold text-gray-900">৳{selectedBagsTotalAmount}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">Number of bags</p>
                  <p className="text-lg font-semibold text-gray-700">{selectedBags.length}</p>
                </div>
              </div>

              <button
                onClick={confirmCashOut}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
              >
                <CheckCircle className="w-6 h-6" />
                Confirm Cash Out Selection
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <CashOutConfirmationModal
        showConfirmModal={showConfirmModal}
        setShowConfirmModal={setShowConfirmModal}
        // totalEnteredAmount={totalEnteredAmount}
        // denominations={denominations}
        selectedRows={selectedRows}
        selectedVaultId={selectedVaultId}
        amounts={selectedBagsTotalAmount}
        refetch={refetch}
      />
    </div>
  );
};

export default CashOut;
