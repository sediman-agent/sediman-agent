use crossterm::event::{KeyEvent, MouseEvent};

pub enum AppEvent {
    Key(KeyEvent),
    Mouse(MouseEvent),
    Paste(String),
    Tick,
    Resize(u16, u16),
    Shutdown,
    AgentStep(String, String),
    AgentResult(AgentResultData),
    AgentError(String),
    AgentDone,
    CommandOutput(String),
    StreamingToken(StreamingTokenData),
    Progress(ProgressData),
    UpdateSuccess,
    UpdateFailed(String),
    UpdateAvailable {
        version: String,
        release_notes: String,
        current_version: String,
    },
    DoctorInstallOutput(String),
    DoctorInstallDone {
        category: String,
        success: bool,
    },
}

#[derive(Clone, Debug)]
pub struct AgentResultData {
    pub success: bool,
    pub text: String,
    pub elapsed_secs: u64,
    pub skill_created: Option<String>,
    pub scheduled_job: Option<String>,
}

#[derive(Clone, Debug)]
pub struct StreamingTokenData {
    pub token: String,
    pub phase: String,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ProgressKind {
    Retry,
    Validation,
    Reflection,
}

#[derive(Clone, Debug)]
pub struct ProgressData {
    pub kind: ProgressKind,
    pub current_attempt: Option<u32>,
    pub max_attempts: Option<u32>,
    pub countdown_seconds: Option<f32>,
    pub confidence: Option<f32>,
    pub issues_count: Option<usize>,
    pub message: String,
}

impl ProgressData {
    pub fn retry(attempt: u32, max: u32, countdown: f32) -> Self {
        Self {
            kind: ProgressKind::Retry,
            current_attempt: Some(attempt),
            max_attempts: Some(max),
            countdown_seconds: Some(countdown),
            confidence: None,
            issues_count: None,
            message: format!("Retrying ({}/{})", attempt, max),
        }
    }

    pub fn validation(confidence: f32, issues: usize) -> Self {
        Self {
            kind: ProgressKind::Validation,
            current_attempt: None,
            max_attempts: None,
            countdown_seconds: None,
            confidence: Some(confidence),
            issues_count: Some(issues),
            message: format!("Validating (confidence: {:.2})", confidence),
        }
    }

    pub fn reflection() -> Self {
        Self {
            kind: ProgressKind::Reflection,
            current_attempt: None,
            max_attempts: None,
            countdown_seconds: None,
            confidence: None,
            issues_count: None,
            message: "Reflecting...".to_string(),
        }
    }
}
