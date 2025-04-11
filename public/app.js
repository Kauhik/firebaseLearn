// app.js (ES module)

// 1) Import Firebase SDK modules from the CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc // needed for fetching doc when editing
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// 2) Firebase Configuration (replace with your own credentials if needed)
const firebaseConfig = {
  apiKey: "AIzaSyDqsxhXZ4yaLSvEQ-8sOFJZdAYYoJqgGz0",
  authDomain: "fir-learn-73b00.firebaseapp.com",
  projectId: "fir-learn-73b00",
  storageBucket: "fir-learn-73b00.firebasestorage.app",
  messagingSenderId: "323795675613",
  appId: "1:323795675613:web:fea3244068439a0eba2e34",
  measurementId: "G-R6QZ7C18RW"
};

// 3) Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// 4) Set up Google Auth Provider
const provider = new GoogleAuthProvider();

// 5) Grab UI elements
const btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
const btnSignOut = document.getElementById('btnSignOut');
const userInfo = document.getElementById('userInfo');

const dealForm = document.getElementById('dealForm');
const dealNameField = document.getElementById('dealName');
const dealStageField = document.getElementById('dealStage');
const dealsContainer = document.getElementById('dealsContainer');

// Elements for editing deals
const editDealDialog = document.getElementById('editDealDialog');
const editDealForm = document.getElementById('editDealForm');
const editDealName = document.getElementById('editDealName');
const editDealStage = document.getElementById('editDealStage');
const cancelEdit = document.getElementById('cancelEdit');

let currentEditDocId = null; // Track the document ID of the deal to edit

// 6) --- Client-side validation function ---
// This function acts like a schema validator for each deal
function validateDeal(deal) {
  if (!deal.name || typeof deal.name !== 'string' || deal.name.trim() === '') {
    throw new Error('Deal name is required and must be a non-empty string.');
  }
  const validStages = ["prospecting", "negotiation", "dealing", "closedWon", "closedLost"];
  if (!deal.stage || !validStages.includes(deal.stage)) {
    throw new Error('Invalid deal stage. Must be one of: ' + validStages.join(', '));
  }
  return true;
}

// 7) Sign In with Google
btnGoogleSignIn.addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error with Google Sign In:", error);
  }
});

// 8) Sign Out
btnSignOut.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log("User signed out.");
  } catch (error) {
    console.error("Error signing out:", error);
  }
});

// 9) Auth State Listener
onAuthStateChanged(auth, user => {
  if (user) {
    userInfo.textContent = `Signed in as: ${user.displayName} (${user.email})`;
  } else {
    userInfo.textContent = "Not signed in.";
  }
});

// 10) Create a new deal
dealForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const dealName = dealNameField.value.trim();
  const dealStage = dealStageField.value;
  
  // Create an object to validate
  const newDeal = { name: dealName, stage: dealStage };

  try {
    // Validate before writing
    validateDeal(newDeal);

    await addDoc(collection(db, "deals"), {
      name: newDeal.name,
      stage: newDeal.stage,
      createdAt: serverTimestamp(),
      uid: auth.currentUser ? auth.currentUser.uid : null,
    });
    dealForm.reset();
  } catch (err) {
    console.error("Error adding deal to Firestore:", err);
    alert(err.message);
  }
});

// 11) Real-time listener to display deals from Firestore
onSnapshot(collection(db, "deals"), (snapshot) => {
  dealsContainer.innerHTML = "";
  snapshot.forEach(docSnap => {
    const dealData = docSnap.data();
    const dealId = docSnap.id;
    const dealDiv = document.createElement('div');
    dealDiv.classList.add('deal');
    
    dealDiv.innerHTML = `
      <strong>${dealData.name}</strong> – <em>${dealData.stage}</em><br/>
      <small>Doc ID: ${dealId}</small>
      <div class="buttons">
        <button data-id="${dealId}" class="edit-deal">Edit</button>
        <button data-id="${dealId}" class="delete-deal">Delete</button>
      </div>
    `;
    dealsContainer.appendChild(dealDiv);
  });
});

// 12) Event Delegation for Edit & Delete buttons
document.addEventListener('click', async (e) => {
  // Edit Deal Button Clicked
  if (e.target.matches('.edit-deal')) {
    currentEditDocId = e.target.getAttribute('data-id');
    const docRef = doc(db, "deals", currentEditDocId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      editDealName.value = data.name;
      editDealStage.value = data.stage;
      editDealDialog.showModal();
    }
  }

  // Delete Deal Button Clicked
  if (e.target.matches('.delete-deal')) {
    const docIdToDelete = e.target.getAttribute('data-id');
    try {
      await deleteDoc(doc(db, "deals", docIdToDelete));
    } catch (err) {
      console.error("Error deleting deal:", err);
      alert("Failed to delete deal.");
    }
  }
});

// 13) Handle Edit Deal Form Submission (Update)
editDealForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentEditDocId) return;
  
  const updatedName = editDealName.value.trim();
  const updatedStage = editDealStage.value;
  
  // Validate updated data
  try {
    validateDeal({ name: updatedName, stage: updatedStage });
    await updateDoc(doc(db, "deals", currentEditDocId), {
      name: updatedName,
      stage: updatedStage
    });
    editDealDialog.close();
    currentEditDocId = null;
  } catch (err) {
    console.error("Error updating deal:", err);
    alert(err.message);
  }
});

// Cancel Edit
cancelEdit.addEventListener('click', () => {
  editDealDialog.close();
  currentEditDocId = null;
});

// Optional: Function to seed the database with initial data (run once if needed)
// async function seedDeals() {
//   const seedData = [
//     { name: "Seed Deal 1", stage: "prospecting" },
//     { name: "Seed Deal 2", stage: "negotiation" },
//   ];
//   for (const deal of seedData) {
//     try {
//       validateDeal(deal);
//       await addDoc(collection(db, "deals"), {
//         ...deal,
//         createdAt: serverTimestamp()
//       });
//     } catch (err) {
//       console.error("Error seeding deal:", err);
//     }
//   }
// }

// Uncomment the next line to seed data once, then comment it back out:
// seedDeals();

console.log("Firebase app initialized. Auth & Firestore (CRUD) are ready.");
