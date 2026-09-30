const NewRequestMailFormet = ({
  providerName,
  userName,
  title,
  date,
  time,
  userEmail,
  description,
}) => {
  return `
    <div>
      <p>
        Dear <strong>${providerName}</strong>,
      </p>

      <p>
        You have received a new service request from
        <strong>${userName}</strong>. Below are the request details:
      </p>

      <p>
        <strong>Service Requested:</strong> ${title}
        <br />
        <strong>Date & Time:</strong> ${(date, time)}
        <br />
        <strong>User Name:</strong> ${userName}
        <br />
        <strong>Contact:</strong> ${userEmail}<br />
      </p>

      <p>
        <strong>Additional Notes:</strong>
        <br />
         ${description}
      </p>

      <p>Please respond to the user as soon as possible.</p>

      <p>
        Thank you,
        <br />
        <strong>UrbanAssist Team</strong>
        <br />
        <a href="/">Visit UrbanAssist</a>
        <br />
        <a href="mailto:[support@urbanassist.org]">Contact Support</a>
      </p>
    </div>`;
};

const RequestAcceptMailFormet = ({
  userName,
  serviceTitle,
  providerName,
  date,
  time,
  providerEmail,
}) => {
  return `<div>
  
    <p>Dear <strong>${userName}</strong>,</p>

    <p>Good news! Your service request for <strong>${serviceTitle}</strong> has been accepted by <strong>${providerName}</strong>.</p>

    <p><strong>Service Provider:</strong> ${providerName}<br>
    <strong>Date & Time:</strong> ${(date, time)}<br>
    <strong>Contact:</strong>${providerEmail} <br>
    

    <p>The service provider will contact you soon. If you have any questions, feel free to reach out to them.</p>

    <p>Thank you for using <strong>UrbanAssist</strong>!</p>

    <p>Best regards,<br>
    <strong>UrbanAssist Team</strong><br>
    <a href="/">Visit UrbanAssist</a><br>
    <a href="mailto:support@urbanassist.org">Contact Support</a></p>
  </div>`;
};

const RequestRejectMailFormet = ({ userName, serviceTitle, providerName }) => {
  return `<div>

    <p>Dear <strong>${userName}</strong>,</p>

    <p>Unfortunately, your service request for <strong>${serviceTitle}</strong> has been declined by <strong>${providerName}</strong>.</p>

    <p>You can try booking another service provider through <strong>UrbanAssist</strong>. We apologize for the inconvenience.</p>

    <p>If you need any assistance, feel free to reach out to us.</p>

    <p>Best regards,<br>
    <strong>UrbanAssist Team</strong><br>
    <a href="/">Visit UrbanAssist</a><br>
    <a href="mailto:support@urbanassist.org">Contact Support</a></p>
  
  
  </div>`;
};

module.exports = {
  NewRequestMailFormet,
  RequestAcceptMailFormet,
  RequestRejectMailFormet,
};
