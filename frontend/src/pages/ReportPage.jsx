import React from 'react';
import IssueReportForm from '../components/IssueReportForm';

const ReportPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <IssueReportForm />
      </div>
    </div>
  );
};

export default ReportPage;