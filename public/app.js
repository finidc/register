const form = document.querySelector("#registration-form");
const formMessage = document.querySelector("#form-message");
const profession = document.querySelector("#profession");
const professionOtherField = document.querySelector("#profession-other-field");
const professionOther = document.querySelector("#profession-other");
const successPanel = document.querySelector("#success-panel");
const registerAnother = document.querySelector("#register-another");

profession.addEventListener("change", () => {
  const show = profession.value === "other";
  professionOtherField.classList.toggle("hidden", !show);
  professionOther.required = show;
  if (!show) professionOther.value = "";
});

function markInvalid(element, invalid) {
  element.setAttribute("aria-invalid", String(invalid));
}

function validateContact() {
  const phone = form.elements.phone.value.trim();
  const email = form.elements.email.value.trim();
  const invalid = !phone && !email;
  markInvalid(form.elements.phone, invalid);
  markInvalid(form.elements.email, invalid);
  return !invalid;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const contactIsValid = validateContact();
  if (!form.reportValidity() || !contactIsValid) {
    formMessage.textContent = contactIsValid
      ? "Please check the highlighted required fields."
      : "Please provide a phone number or email address.";
    return;
  }

  const data = new FormData(form);
  const turnstileToken = data.get("cf-turnstile-response");
  if (!turnstileToken) {
    formMessage.textContent = "Please complete the security check.";
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Sending securely…";

  const payload = {
    name: data.get("name"),
    phone: data.get("phone"),
    email: data.get("email"),
    profession: data.get("profession"),
    professionOther: data.get("professionOther"),
    city: data.get("city"),
    language: data.get("language"),
    interests: data.getAll("interests"),
    website: data.get("website"),
    consent: data.get("consent") === "on",
    turnstileToken,
  };

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Registration failed.");

    form.classList.add("hidden");
    document.querySelector(".form-heading").classList.add("hidden");
    successPanel.classList.remove("hidden");
    successPanel.focus();
  } catch (error) {
    formMessage.textContent = error.message || "Something went wrong. Please try again.";
    window.turnstile?.reset();
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Send my registration";
  }
});

for (const name of ["phone", "email"]) {
  form.elements[name].addEventListener("input", validateContact);
}

registerAnother.addEventListener("click", () => {
  form.reset();
  profession.dispatchEvent(new Event("change"));
  form.classList.remove("hidden");
  document.querySelector(".form-heading").classList.remove("hidden");
  successPanel.classList.add("hidden");
  formMessage.textContent = "";
  window.turnstile?.reset();
  form.elements.name.focus();
});
