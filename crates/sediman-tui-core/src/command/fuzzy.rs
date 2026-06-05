fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let a_len = a_chars.len();
    let b_len = b_chars.len();

    if a_len == 0 { return b_len; }
    if b_len == 0 { return a_len; }

    let mut prev = vec![0usize; b_len + 1];
    let mut curr = vec![0usize; b_len + 1];

    for j in 0..=b_len {
        prev[j] = j;
    }

    for i in 0..a_len {
        curr[0] = i + 1;
        for j in 0..b_len {
            let cost = if a_chars[i] == b_chars[j] { 0 } else { 1 };
            curr[j + 1] = (prev[j + 1] + 1)
                .min(curr[j] + 1)
                .min(prev[j] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }

    prev[b_len]
}

use super::registry::Command;

pub fn fuzzy_match(input: &str, commands: &[&Command]) -> Option<usize> {
    let input_lower = input.to_lowercase();
    if input_lower.is_empty() {
        return commands.first().map(|_| 0);
    }

    let lower_names: Vec<String> = commands.iter().map(|c| c.name.to_lowercase()).collect();
    let lower_aliases: Vec<Vec<String>> = commands.iter()
        .map(|c| c.aliases.iter().map(|a| a.to_lowercase()).collect())
        .collect();

    let exact = lower_names.iter().position(|n| n == &input_lower)
        .or_else(|| {
            lower_aliases.iter().position(|aliases| aliases.iter().any(|a| a == &input_lower))
        });
    if let Some(idx) = exact {
        return Some(idx);
    }

    let starts_with = lower_names.iter().position(|n| n.starts_with(&input_lower))
        .or_else(|| {
            lower_aliases.iter().position(|aliases| aliases.iter().any(|a| a.starts_with(&input_lower)))
        });
    if let Some(idx) = starts_with {
        return Some(idx);
    }

    let contains = lower_names.iter().position(|n| n.contains(&input_lower));
    if let Some(idx) = contains {
        return Some(idx);
    }

    let best = lower_names
        .iter()
        .enumerate()
        .map(|(i, n)| (levenshtein(&input_lower, n), i))
        .filter(|(dist, _)| *dist <= 3)
        .min_by_key(|(dist, _)| *dist);

    best.map(|(_, i)| i)
}

#[cfg(test)]
mod tests {
    use super::*;

    static CMD_SKILLS: Command = Command {
        name: "/skills",
        aliases: &["/skill list"],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    static CMD_HELP: Command = Command {
        name: "/help",
        aliases: &["/h", "/?"],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    static CMD_EXIT: Command = Command {
        name: "/exit",
        aliases: &["/quit"],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    static CMD_SCHEDULE: Command = Command {
        name: "/schedule",
        aliases: &[],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    static CMD_SESSIONS: Command = Command {
        name: "/sessions",
        aliases: &[],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    static CMD_RUN_SKILL: Command = Command {
        name: "/run-skill",
        aliases: &[],
        description: "",
        category: super::super::registry::CommandCategory::General,
    };

    #[test]
    fn test_levenshtein_identical() {
        assert_eq!(levenshtein("hello", "hello"), 0);
    }

    #[test]
    fn test_levenshtein_empty() {
        assert_eq!(levenshtein("", "abc"), 3);
        assert_eq!(levenshtein("abc", ""), 3);
        assert_eq!(levenshtein("", ""), 0);
    }

    #[test]
    fn test_levenshtein_substitution() {
        assert_eq!(levenshtein("cat", "car"), 1);
    }

    #[test]
    fn test_levenshtein_insertion() {
        assert_eq!(levenshtein("cat", "cats"), 1);
    }

    #[test]
    fn test_levenshtein_deletion() {
        assert_eq!(levenshtein("cats", "cat"), 1);
    }

    #[test]
    fn test_levenshtein_complex() {
        assert_eq!(levenshtein("kitten", "sitting"), 3);
    }

    #[test]
    fn test_fuzzy_match_exact() {
        let cmds: [&Command; 3] = [&CMD_SKILLS, &CMD_HELP, &CMD_EXIT];
        assert_eq!(fuzzy_match("/skills", &cmds), Some(0));
        assert_eq!(fuzzy_match("/help", &cmds), Some(1));
        assert_eq!(fuzzy_match("/exit", &cmds), Some(2));
    }

    #[test]
    fn test_fuzzy_match_alias() {
        let cmds: [&Command; 2] = [&CMD_SKILLS, &CMD_HELP];
        assert_eq!(fuzzy_match("/skill list", &cmds), Some(0));
        assert_eq!(fuzzy_match("/h", &cmds), Some(1));
        assert_eq!(fuzzy_match("/?", &cmds), Some(1));
    }

    #[test]
    fn test_fuzzy_match_starts_with() {
        let cmds: [&Command; 3] = [&CMD_SKILLS, &CMD_SCHEDULE, &CMD_SESSIONS];
        assert_eq!(fuzzy_match("/sk", &cmds), Some(0));
        assert_eq!(fuzzy_match("/sch", &cmds), Some(1));
        assert_eq!(fuzzy_match("/ses", &cmds), Some(2));
    }

    #[test]
    fn test_fuzzy_match_contains() {
        let cmds: [&Command; 3] = [&CMD_RUN_SKILL, &CMD_SKILLS, &CMD_SCHEDULE];
        // "/run-skill" contains "skill" → matched first at index 0
        assert_eq!(fuzzy_match("skill", &cmds), Some(0));
    }

    #[test]
    fn test_fuzzy_match_case_insensitive() {
        let cmds: [&Command; 1] = [&CMD_HELP];
        assert_eq!(fuzzy_match("/help", &cmds), Some(0));
        assert_eq!(fuzzy_match("/HELP", &cmds), Some(0));
    }

    #[test]
    fn test_fuzzy_match_levenshtein_fallback() {
        let cmds: [&Command; 2] = [&CMD_SKILLS, &CMD_HELP];
        assert_eq!(fuzzy_match("/helkp", &cmds), Some(1));
    }

    #[test]
    fn test_fuzzy_match_no_match() {
        let cmds: [&Command; 1] = [&CMD_HELP];
        assert_eq!(fuzzy_match("/xyz", &cmds), None);
    }

    #[test]
    fn test_fuzzy_match_empty_input() {
        let cmds: [&Command; 1] = [&CMD_HELP];
        // empty string starts every command name → match at 0
        assert_eq!(fuzzy_match("", &cmds), Some(0));
    }

    #[test]
    fn test_fuzzy_match_empty_commands() {
        let cmds: [&Command; 0] = [];
        assert_eq!(fuzzy_match("/help", &cmds), None);
    }

    #[test]
    fn test_levenshtein_distance_boundary() {
        let cmds: [&Command; 1] = [&CMD_HELP];
        assert_eq!(fuzzy_match("/helo", &cmds), Some(0));
    }

    #[test]
    fn test_levenshtein_distance_too_far() {
        let cmds: [&Command; 1] = [&CMD_HELP];
        assert_eq!(fuzzy_match("/helloworld", &cmds), None);
    }

    #[test]
    fn test_fuzzy_match_empty_commands_list() {
        let cmds: [&Command; 0] = [];
        assert_eq!(fuzzy_match("/help", &cmds), None);
    }
}
