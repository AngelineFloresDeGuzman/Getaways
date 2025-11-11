# Policy & Compliance System - Testing Guide

## 📍 Where Guests Encounter Policies

### 1. **Footer Links (All Pages)**
   - **Location**: Bottom of every page
   - **Links**:
     - "Cancellation Policy" → `/guest/policies#cancellation`
     - "Policies & Guidelines" → `/guest/policies`
     - "Privacy Policy" → `/guest/policies#privacy`
     - "Terms of Service" → `/guest/policies#terms`
   - **File**: `src/components/Footer.jsx`

### 2. **Booking Request Page**
   - **Location**: During booking process
   - **Link**: "View cancellation policy" → `/guest/policies#cancellation`
   - **File**: `src/pages/Guest/BookingRequest.jsx` (line 892)
   - **Context**: Shows cancellation policy link when making a booking

### 3. **Dedicated Policies Page**
   - **URL**: `/guest/policies`
   - **File**: `src/pages/Guest/Policies.jsx`
   - **Features**:
     - Sidebar navigation with policy sections
     - Hash anchors for direct linking (e.g., `#cancellation`, `#terms`, `#privacy`)
     - Displays active policies from Firestore
   - **Policy Types Shown**:
     - Cancellation Policy (Guest)
     - Terms & Conditions
     - Privacy Policy
     - Guest Rules & Regulations
     - Refund Policy
     - Community Standards

---

## 📍 Where Hosts Encounter Policies

### 1. **Service Onboarding - ServiceWhatProvide**
   - **Location**: Service listing creation flow
   - **File**: `src/pages/Host/onboarding/ServiceWhatProvide.jsx` (lines 394-397)
   - **Links**:
     - Services terms → `/host/policies#service`
     - Host cancellation policy → `/host/policies#cancellation`
     - Cancellation policies → `/host/policies#cancellation`
     - Privacy policy → `/host/policies#privacy`
   - **Context**: Terms agreement during service listing creation

### 2. **Experience Onboarding - ExperienceDetails**
   - **Location**: Experience listing creation flow
   - **File**: `src/pages/Host/onboarding/ExperienceDetails.jsx` (line 2801)
   - **Links**:
     - Experiences terms → `/host/policies#experience`
     - Host cancellation policy → `/host/policies#cancellation`
     - Cancellation policies → `/host/policies#cancellation`
     - Privacy policy → `/host/policies#privacy`
   - **Context**: Terms agreement during experience listing creation

### 3. **Dedicated Host Policies Page**
   - **URL**: `/host/policies`
   - **File**: `src/pages/Host/Policies.jsx`
   - **Features**:
     - Sidebar navigation with policy sections
     - Hash anchors for direct linking
     - Requires login (redirects to login if not authenticated)
   - **Policy Types Shown**:
     - Host Cancellation Policy
     - Terms & Conditions
     - Privacy Policy
     - Host Rules & Regulations
     - Refund Policy
     - Community Standards
     - Service Terms
     - Experience Terms

---

## 🧪 How to Test the Policy System

### **Step 1: Access Admin Dashboard**
1. Log in as an admin user
2. Navigate to: `/admin/admindashboard`
3. Click on the **"Compliance"** tab

### **Step 2: Create/Manage Policies**
1. In the Compliance tab, you'll see the **Policy Management** interface
2. **Initialize Default Policies** (if first time):
   - Click "Initialize Default Policies" button
   - This creates default policies for all types
3. **Create a New Policy**:
   - Click "Create New Policy" button
   - Fill in:
     - **Policy Type**: Select from dropdown (e.g., Guest Cancellation, Host Cancellation, Terms, Privacy, etc.)
     - **Title**: Policy title
     - **Content**: Policy content (supports Markdown)
     - **Applies To**: Select "Guest" or "Host" or both
     - **Active Status**: Toggle on/off
     - **Version**: Version number (e.g., 1.0)
   - Click "Save Policy"

4. **Edit Existing Policy**:
   - Click the "Edit" icon (pencil) on any policy card
   - Modify the content
   - Click "Save Policy"

5. **Toggle Policy Status**:
   - Click the switch on any policy card to activate/deactivate
   - Only active policies are shown to guests/hosts

6. **Delete Policy**:
   - Click the "Delete" icon (trash) on any policy card
   - Confirm deletion

### **Step 3: Test Guest Policy Access**

#### **Test 1: Footer Links**
1. Go to any page (e.g., homepage `/`)
2. Scroll to the footer
3. Click on:
   - "Cancellation Policy" → Should open `/guest/policies#cancellation`
   - "Policies & Guidelines" → Should open `/guest/policies`
   - "Privacy Policy" → Should open `/guest/policies#privacy`
   - "Terms of Service" → Should open `/guest/policies#terms`
4. **Verify**: Each link should navigate to the correct section

#### **Test 2: Booking Request Page**
1. Log in as a guest
2. Navigate to any listing detail page
3. Click "Request to Book"
4. On the booking request page, find the cancellation policy section
5. Click "View cancellation policy" link
6. **Verify**: Should navigate to `/guest/policies#cancellation`

#### **Test 3: Direct Policy Page Access**
1. Navigate directly to: `/guest/policies`
2. **Verify**:
   - Page loads with sidebar navigation
   - Default section is "Cancellation Policy"
   - All policy sections are listed in sidebar
   - Clicking each section shows the corresponding policy
   - Hash anchors work (e.g., `/guest/policies#privacy` jumps to Privacy section)

#### **Test 4: Hash Anchor Navigation**
1. Navigate to: `/guest/policies#terms`
2. **Verify**: Page loads and automatically scrolls to "Terms & Conditions" section
3. Try other anchors:
   - `/guest/policies#cancellation`
   - `/guest/policies#privacy`
   - `/guest/policies#rules`
   - `/guest/policies#refund`
   - `/guest/policies#community`

### **Step 4: Test Host Policy Access**

#### **Test 1: Service Onboarding**
1. Log in as a host
2. Navigate to: `/pages/onboarding/service-what-provide`
3. Scroll to the terms section at the bottom
4. Click on any policy link:
   - "services terms" → `/host/policies#service`
   - "host cancellation policy" → `/host/policies#cancellation`
   - "privacy policy" → `/host/policies#privacy`
5. **Verify**: Each link opens in a new tab/window and navigates correctly

#### **Test 2: Experience Onboarding**
1. Log in as a host
2. Navigate to: `/pages/onboarding/experience-details`
3. Scroll to the terms section
4. Click on policy links
5. **Verify**: Links navigate to correct host policy sections

#### **Test 3: Direct Host Policy Page Access**
1. Navigate to: `/host/policies`
2. **Verify**:
   - If not logged in, redirects to login
   - If logged in, shows host policies page
   - Sidebar shows all host-specific policy sections
   - Hash anchors work correctly

### **Step 5: Test Admin Policy Management**

#### **Test 1: Create a Test Policy**
1. As admin, go to Compliance tab
2. Create a new policy:
   - Type: "Guest Cancellation"
   - Title: "Test Cancellation Policy"
   - Content: "This is a test policy content with **markdown** support."
   - Applies To: "Guest"
   - Active: ON
3. Save the policy
4. **Verify**: Policy appears in the list

#### **Test 2: View Policy on Guest Page**
1. After creating the policy above
2. Navigate to `/guest/policies#cancellation` as a guest
3. **Verify**: The new policy content is displayed

#### **Test 3: Deactivate Policy**
1. In admin dashboard, toggle OFF a policy
2. Navigate to guest/host policy page
3. **Verify**: Deactivated policy is NOT shown (shows "Policy Not Available" message)

#### **Test 4: Edit Policy**
1. Edit an existing policy in admin
2. Change the content
3. Save
4. Navigate to guest/host policy page
5. **Verify**: Updated content is displayed

#### **Test 5: Filter Policies**
1. In admin dashboard, use the filter dropdown
2. Filter by different policy types
3. **Verify**: Only policies of selected type are shown

### **Step 6: Test Markdown Rendering**
1. Create/edit a policy with markdown content:
   ```markdown
   # Heading
   **Bold text**
   - List item 1
   - List item 2
   [Link](https://example.com)
   ```
2. Save the policy
3. View it on guest/host policy page
4. **Verify**: Markdown is properly rendered as formatted HTML

### **Step 7: Test Multiple Versions**
1. Create a policy with version "1.0"
2. Create another policy of the same type with version "2.0"
3. Set only version "2.0" as active
4. **Verify**: Only version 2.0 is shown to guests/hosts

---

## 🔍 Quick Test Checklist

### Guest Access
- [ ] Footer links work on all pages
- [ ] Booking request page shows cancellation policy link
- [ ] `/guest/policies` page loads correctly
- [ ] Hash anchors work (`#cancellation`, `#terms`, `#privacy`, etc.)
- [ ] Policy content displays correctly
- [ ] Markdown formatting works

### Host Access
- [ ] Service onboarding shows policy links
- [ ] Experience onboarding shows policy links
- [ ] `/host/policies` requires login
- [ ] Host policies page shows correct sections
- [ ] Hash anchors work for host policies

### Admin Management
- [ ] Can create new policies
- [ ] Can edit existing policies
- [ ] Can delete policies
- [ ] Can toggle active/inactive status
- [ ] Can filter policies by type
- [ ] Changes reflect immediately on guest/host pages

### Edge Cases
- [ ] Inactive policies don't show to guests/hosts
- [ ] Missing policies show "Policy Not Available" message
- [ ] Direct hash anchor URLs work (e.g., `/guest/policies#privacy`)
- [ ] Policies with no content handle gracefully

---

## 🚀 Quick Start Testing Commands

### Access URLs:
- **Guest Policies**: `http://localhost:5173/guest/policies`
- **Host Policies**: `http://localhost:5173/host/policies`
- **Admin Dashboard**: `http://localhost:5173/admin/admindashboard` (then click "Compliance" tab)

### Test Hash Anchors:
- `/guest/policies#cancellation`
- `/guest/policies#terms`
- `/guest/policies#privacy`
- `/host/policies#cancellation`
- `/host/policies#service`
- `/host/policies#experience`

---

## 📝 Notes

1. **Policy Types**: Different policy types are defined in `src/pages/Admin/services/policyService.js`
2. **Markdown Support**: Policies support Markdown formatting via `react-markdown`
3. **Active Status**: Only policies with `isActive: true` are shown to guests/hosts
4. **Version Control**: Multiple versions can exist, but only active ones are displayed
5. **Applies To**: Policies can apply to "Guest", "Host", or both

---

## 🐛 Troubleshooting

### Policies not showing?
- Check if policy is marked as "Active" in admin dashboard
- Verify policy type matches what's expected (Guest vs Host)
- Check browser console for errors

### Hash anchors not working?
- Ensure you're using the correct hash (e.g., `#cancellation` not `#Cancellation`)
- Check that the policy section ID matches the hash

### Markdown not rendering?
- Verify `react-markdown` is installed: `npm list react-markdown`
- Check browser console for errors

### Changes not reflecting?
- Refresh the page (policies are loaded on page load)
- Check Firestore to verify policy was saved correctly
- Verify you're viewing the correct policy type (Guest vs Host)

